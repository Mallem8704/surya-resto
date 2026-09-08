import datetime
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import TableReservation, CafeTable, Outlet, User
from app.schemas import (
    TableReservationCreate,
    TableReservationOut,
    TableReservationStatusUpdate,
)
from app.routers.auth import require_staff_or_owner
from app.routers.ws import manager
from app.audit_utils import log_audit

router = APIRouter(prefix="", tags=["Table Pre-Booking & Reservations"])


def generate_reservation_number():
    """Generate unique reservation reference code e.g. RES-260902-A1B2"""
    date_part = datetime.date.today().strftime("%y%m%d")
    unique_part = uuid.uuid4().hex[:4].upper()
    return f"RES-{date_part}-{unique_part}"


@router.get("/setup-table")
def setup_reservation_table(db: Session = Depends(get_db)):
    """Initialize table_reservations in DB if missing."""
    try:
        from app.database import engine
        from sqlalchemy import text
        with engine.begin() as conn:
            if engine.dialect.name == "sqlite":
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS table_reservations (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        outlet_id INTEGER NOT NULL REFERENCES outlets(id),
                        reservation_number VARCHAR(50) UNIQUE NOT NULL,
                        customer_name VARCHAR(150) NOT NULL,
                        customer_phone VARCHAR(50) NOT NULL,
                        customer_email VARCHAR(150),
                        party_size INTEGER NOT NULL DEFAULT 2,
                        reservation_date VARCHAR(50) NOT NULL,
                        reservation_time VARCHAR(50) NOT NULL,
                        seating_preference VARCHAR(50) DEFAULT 'standard',
                        occasion VARCHAR(100) DEFAULT 'casual',
                        special_requests TEXT,
                        table_id INTEGER REFERENCES tables(id) ON DELETE SET NULL,
                        status VARCHAR(50) DEFAULT 'confirmed',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                """))
            else:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS table_reservations (
                        id SERIAL PRIMARY KEY,
                        outlet_id INTEGER NOT NULL REFERENCES outlets(id),
                        reservation_number VARCHAR(50) UNIQUE NOT NULL,
                        customer_name VARCHAR(150) NOT NULL,
                        customer_phone VARCHAR(50) NOT NULL,
                        customer_email VARCHAR(150),
                        party_size INTEGER NOT NULL DEFAULT 2,
                        reservation_date VARCHAR(50) NOT NULL,
                        reservation_time VARCHAR(50) NOT NULL,
                        seating_preference VARCHAR(50) DEFAULT 'standard',
                        occasion VARCHAR(100) DEFAULT 'casual',
                        special_requests TEXT,
                        table_id INTEGER REFERENCES tables(id) ON DELETE SET NULL,
                        status VARCHAR(50) DEFAULT 'confirmed',
                        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE INDEX IF NOT EXISTS ix_table_reservations_outlet_id ON table_reservations(outlet_id);
                    CREATE INDEX IF NOT EXISTS ix_table_reservations_reservation_number ON table_reservations(reservation_number);
                """))
        return {"status": "ok", "message": "table_reservations table is ready"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def resolve_target_outlet(db: Session, requested_id: Optional[int]) -> Outlet:
    """Safely resolve outlet ID whether it's an absolute DB ID or relative index (1 or 2)."""
    all_outlets = db.query(Outlet).order_by(Outlet.id.asc()).all()
    if not all_outlets:
        outlet = Outlet(name="Surya Family Restaurant", currency="INR", tax_rate_percent=0)
        db.add(outlet)
        db.commit()
        db.refresh(outlet)
        return outlet
    
    if requested_id is None:
        return all_outlets[0]
        
    for o in all_outlets:
        if o.id == requested_id:
            return o
            
    # Check 1-based relative index (1 -> Branch 1, 2 -> Branch 2)
    if requested_id == 1 and len(all_outlets) >= 1:
        return all_outlets[0]
    if requested_id == 2 and len(all_outlets) >= 2:
        return all_outlets[1]
        
    return all_outlets[0]


@router.post("", response_model=TableReservationOut)
@router.post("/", response_model=TableReservationOut)
async def create_table_reservation(
    data: TableReservationCreate,
    db: Session = Depends(get_db),
):
    """Public endpoint: Pre-book a table in advance at Surya Family Restaurant."""
    try:
        # Ensure table exists in database
        try:
            TableReservation.__table__.create(bind=db.get_bind(), checkfirst=True)
        except Exception:
            pass

        target_outlet = resolve_target_outlet(db, data.outlet_id)
        resolved_outlet_id = target_outlet.id

        res_num = generate_reservation_number()
        # Retry on collision
        while db.query(TableReservation).filter(TableReservation.reservation_number == res_num).first():
            res_num = generate_reservation_number()

        # Find suitable available table for this outlet
        matched_table = None
        try:
            matched_table = (
                db.query(CafeTable)
                .filter(
                    CafeTable.outlet_id == resolved_outlet_id,
                    CafeTable.status == "free",
                )
                .first()
            )
        except Exception:
            pass

        reservation = TableReservation(
            outlet_id=resolved_outlet_id,
            reservation_number=res_num,
            customer_name=data.customer_name.strip(),
            customer_phone=data.customer_phone.strip(),
            customer_email=data.customer_email.strip() if data.customer_email else None,
            party_size=data.party_size,
            reservation_date=data.reservation_date.strip(),
            reservation_time=data.reservation_time.strip(),
            seating_preference=data.seating_preference.strip() if data.seating_preference else "standard",
            occasion=data.occasion.strip() if data.occasion else "casual",
            special_requests=data.special_requests.strip() if data.special_requests else None,
            table_id=matched_table.id if matched_table else None,
            status="confirmed",
        )

        db.add(reservation)
        db.commit()
        db.refresh(reservation)

        # Broadcast real-time reservation alert to staff/admin cockpit safely
        try:
            await manager.broadcast_to_admin(
                outlet_id=reservation.outlet_id,
                event_type="new_reservation",
                data={
                    "id": reservation.id,
                    "reservation_number": reservation.reservation_number,
                    "outlet_id": reservation.outlet_id,
                    "customer_name": reservation.customer_name,
                    "customer_phone": reservation.customer_phone,
                    "party_size": reservation.party_size,
                    "reservation_date": reservation.reservation_date,
                    "reservation_time": reservation.reservation_time,
                    "seating_preference": reservation.seating_preference,
                    "occasion": reservation.occasion,
                    "status": reservation.status,
                    "table_label": matched_table.label if matched_table else None,
                },
            )
        except Exception as ws_err:
            print("[WS Broadcast Error]", ws_err)

        return TableReservationOut(
            id=reservation.id,
            outlet_id=reservation.outlet_id,
            reservation_number=reservation.reservation_number,
            customer_name=reservation.customer_name,
            customer_phone=reservation.customer_phone,
            customer_email=reservation.customer_email,
            party_size=reservation.party_size,
            reservation_date=reservation.reservation_date,
            reservation_time=reservation.reservation_time,
            seating_preference=reservation.seating_preference,
            occasion=reservation.occasion,
            special_requests=reservation.special_requests,
            table_id=reservation.table_id,
            table_label=matched_table.label if matched_table else None,
            status=reservation.status,
            created_at=reservation.created_at,
            updated_at=reservation.updated_at,
        )
    except Exception as e:
        db.rollback()
        import traceback
        trace = traceback.format_exc()
        print("[Reservation Error Traceback]", trace)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to complete table reservation: {str(e)}"
        )


@router.get("", response_model=List[TableReservationOut])
@router.get("/", response_model=List[TableReservationOut])
def list_table_reservations(
    outlet_id: Optional[int] = Query(None),
    date: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Staff / Owner: List all table reservations with live filters."""
    target_outlet = resolve_target_outlet(db, outlet_id if outlet_id is not None else current_user.outlet_id)
    query = (
        db.query(TableReservation)
        .options(joinedload(TableReservation.table))
        .filter(TableReservation.outlet_id == target_outlet.id)
    )

    if date:
        query = query.filter(TableReservation.reservation_date == date)
    if status_filter:
        query = query.filter(TableReservation.status == status_filter)

    reservations = query.order_by(TableReservation.reservation_date.desc(), TableReservation.reservation_time.asc()).all()

    result = []
    for r in reservations:
        result.append(
            TableReservationOut(
                id=r.id,
                outlet_id=r.outlet_id,
                reservation_number=r.reservation_number,
                customer_name=r.customer_name,
                customer_phone=r.customer_phone,
                customer_email=r.customer_email,
                party_size=r.party_size,
                reservation_date=r.reservation_date,
                reservation_time=r.reservation_time,
                seating_preference=r.seating_preference,
                occasion=r.occasion,
                special_requests=r.special_requests,
                table_id=r.table_id,
                table_label=r.table.label if r.table else None,
                status=r.status,
                created_at=r.created_at,
                updated_at=r.updated_at,
            )
        )
    return result


@router.get("/lookup/{query_str}", response_model=TableReservationOut)
def lookup_reservation(
    query_str: str,
    db: Session = Depends(get_db),
):
    """Public: Look up reservation by reservation number or phone number."""
    clean = query_str.strip().upper()
    r = (
        db.query(TableReservation)
        .options(joinedload(TableReservation.table))
        .filter(
            (TableReservation.reservation_number == clean)
            | (TableReservation.customer_phone == clean)
        )
        .order_by(TableReservation.id.desc())
        .first()
    )

    if not r:
        raise HTTPException(status_code=404, detail="Reservation not found")

    return TableReservationOut(
        id=r.id,
        outlet_id=r.outlet_id,
        reservation_number=r.reservation_number,
        customer_name=r.customer_name,
        customer_phone=r.customer_phone,
        customer_email=r.customer_email,
        party_size=r.party_size,
        reservation_date=r.reservation_date,
        reservation_time=r.reservation_time,
        seating_preference=r.seating_preference,
        occasion=r.occasion,
        special_requests=r.special_requests,
        table_id=r.table_id,
        table_label=r.table.label if r.table else None,
        status=r.status,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


@router.patch("/{reservation_id}/status", response_model=TableReservationOut)
async def update_reservation_status(
    reservation_id: int,
    data: TableReservationStatusUpdate,
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Staff / Owner: Confirm, seat, complete, or cancel a reservation, or reassign a table."""
    r = (
        db.query(TableReservation)
        .options(joinedload(TableReservation.table))
        .filter(TableReservation.id == reservation_id, TableReservation.outlet_id == current_user.outlet_id)
        .first()
    )
    if not r:
        raise HTTPException(status_code=404, detail="Reservation not found")

    r.status = data.status
    if data.table_id is not None:
        r.table_id = data.table_id

    db.commit()
    db.refresh(r)

    # Broadcast update
    await manager.broadcast_to_admin(
        event_type="reservation_status_updated",
        data={
            "id": r.id,
            "reservation_number": r.reservation_number,
            "status": r.status,
            "table_id": r.table_id,
            "table_label": r.table.label if r.table else None,
        },
        outlet_id=r.outlet_id,
    )

    return TableReservationOut(
        id=r.id,
        outlet_id=r.outlet_id,
        reservation_number=r.reservation_number,
        customer_name=r.customer_name,
        customer_phone=r.customer_phone,
        customer_email=r.customer_email,
        party_size=r.party_size,
        reservation_date=r.reservation_date,
        reservation_time=r.reservation_time,
        seating_preference=r.seating_preference,
        occasion=r.occasion,
        special_requests=r.special_requests,
        table_id=r.table_id,
        table_label=r.table.label if r.table else None,
        status=r.status,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )
