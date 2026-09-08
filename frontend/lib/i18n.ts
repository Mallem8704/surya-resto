/**
 * Bilingual English & Telugu (తెలుగు) Dictionary for Tea Time Cafe.
 */

export type Language = "en" | "te";

export const dictionary = {
    en: {
        // App & Header
        app_title: "Surya Family Restaurant",
        app_tagline: "Authentic Hyderabadi Biryani, Punjabi Curries & Tandoor",
        table: "Table",
        welcome_table: "Welcome to Table",

        // Categories & Navigation
        all_items: "All Items",
        all_categories: "All Categories",
        chai_hot_drinks: "Beverages & Refreshers",
        bakery_biscuits: "Starters & Platters",
        savory_snacks: "Grills & Mandi",
        coolers_drinks: "Desserts & Drinks",

        // Badges & Filters
        veg: "Veg",
        non_veg: "Non-Veg",
        all_types: "All",
        special: "Special",
        bestseller: "Bestseller",
        in_stock: "In Stock",
        out_of_stock: "Out of Stock",
        low_stock: "Low Stock",

        // Order Statuses
        status_placed: "Placed",
        status_accepted: "Accepted",
        status_preparing: "Preparing",
        status_ready: "Ready for Pickup",
        status_served: "Served",
        status_cancelled: "Cancelled",

        // Action Buttons
        add_to_cart: "Add to Cart",
        added: "Added",
        view_cart: "View Cart",
        checkout: "Proceed to Checkout",
        place_order: "Place Order",
        pay_now_upi: "Pay Now (UPI / Card)",
        pay_at_counter: "Pay at Counter",
        call_staff: "Call Staff",
        request_assistance: "Need Assistance?",
        call_water: "Water",
        call_bill: "Bill Please",
        call_waiter: "Call Waiter",
        call_clean: "Clean Table",
        view_order_status: "Track Order",
        close: "Close",
        back: "Back",
        confirm: "Confirm",
        cancel: "Cancel",
        edit: "Edit",
        delete: "Delete",
        save: "Save Changes",

        // Cart & Checkout
        your_cart: "Your Cart",
        cart_empty: "Your cart is empty. Add delicious dishes from our restaurant menu to get started!",
        item_notes_placeholder: "Any special request? (e.g. Less spicy, extra sauce)",
        subtotal: "Subtotal",
        tax_gst: "GST (5%)",
        total: "Grand Total",
        special_instructions: "Order Notes",
        select_payment_method: "Select Payment Method",

        // Order Tracking
        order_confirmed: "Order Placed Successfully!",
        order_number: "Order Number",
        live_status: "Live Preparation Status",
        order_timeline_placed: "Order received by kitchen",
        order_timeline_accepted: "Order accepted by restaurant",
        order_timeline_preparing: "Fresh gourmet dishes are being prepared in the kitchen",
        order_timeline_ready: "Your order is ready to serve",
        order_timeline_served: "Enjoy your delicious meal!",
        payment_status_pending: "Payment Pending (Pay at Counter)",
        payment_status_paid: "Paid Online",

        // Admin & Management
        admin_dashboard: "Admin Cockpit",
        live_orders: "Live Orders",
        kds_view: "Kitchen Display (KDS)",
        menu_management: "Menu & Pricing",
        tables_qr: "Tables & QR",
        inventory_stock: "Inventory & Stock",
        payments_cashier: "Payments & Cashier",
        sales_analytics: "Sales & Analytics",
        audit_log: "Audit Log",
        login: "Sign In",
        logout: "Sign Out",
        store_settings: "Store Settings",
        captain_pos: "Captain Waiter POS",
        cashier_pos: "Cashier POS Terminal ⚡",
        table_reservations: "Table Reservations",
    },
    te: {
        // App & Header
        app_title: "సూర్య ఫ్యామిలీ రెస్టారెంట్",
        app_tagline: "కదిరిలో రుచికరమైన బిర్యానీ, పంజాబీ కర్రీస్ & తందూరి",
        table: "టేబుల్",
        welcome_table: "స్వాగతం - టేబుల్",

        // Categories & Navigation
        all_items: "అన్ని రకాలు",
        all_categories: "అన్ని విభాగాలు",
        chai_hot_drinks: "పానీయాలు & కూలర్స్",
        bakery_biscuits: "స్టార్టర్స్ & ప్లాటర్స్",
        savory_snacks: "గ్రిల్స్ & మండి",
        coolers_drinks: "డెజర్ట్స్ & డ్రింక్స్",

        // Badges & Filters
        veg: "శాకాహారం",
        non_veg: "మాంసాహారం",
        all_types: "అన్నీ",
        special: "స్పెషల్",
        bestseller: "అత్యంత ప్రియమైనది",
        in_stock: "అందుబాటులో ఉంది",
        out_of_stock: "అయిపోయింది",
        low_stock: "తక్కువ స్టాక్",

        // Order Statuses
        status_placed: "ఆర్డర్ నమోదు అయ్యింది",
        status_accepted: "స్వీకరించబడింది",
        status_preparing: "సిద్ధం చేస్తున్నారు",
        status_ready: "సిద్ధంగా ఉంది",
        status_served: "అందించబడింది",
        status_cancelled: "రద్దు చేయబడింది",

        // Action Buttons
        add_to_cart: "కార్ట్‌కు జోడించు",
        added: "జోడించబడింది",
        view_cart: "కార్ట్ చూడండి",
        checkout: "ఆర్డర్ చేయడానికి వెళ్లండి",
        place_order: "ఆర్డర్ ఇవ్వండి",
        pay_now_upi: "యూపీఐ ద్వారా చెల్లించండి",
        pay_at_counter: "కౌంటర్ వద్ద చెల్లించండి",
        call_staff: "సిబ్బందిని పిలవండి",
        request_assistance: "సహాయం కావాలా?",
        call_water: "మంచినీరు",
        call_bill: "బిల్లు ఇవ్వండి",
        call_waiter: "సర్వర్ పిలుపు",
        call_clean: "టేబుల్ శుభ్రం",
        view_order_status: "ఆర్డర్ స్థితి",
        close: "మూసివేయి",
        back: "వెనుకకు",
        confirm: "నిర్ధారించండి",
        cancel: "రద్దు",
        edit: "సవరించు",
        delete: "తొలగించు",
        save: "సేవ్ చేయండి",

        // Cart & Checkout
        your_cart: "మీ కార్ట్",
        cart_empty: "మీ కార్ట్ ఖాళీగా ఉంది. రెస్టారెంట్ రుచికరమైన వంటకాలను ఎంచుకోండి!",
        item_notes_placeholder: "ఏదైనా సూచనలు? (ఉదా: తక్కువ కారం, అదనపు సాస్)",
        subtotal: "ఉపమొత్తం",
        tax_gst: "జీఎస్టీ పన్ను (5%)",
        total: "మొత్తం చెల్లింపు",
        special_instructions: "ఆర్డర్ సూచనలు",
        select_payment_method: "చెల్లింపు విధానం ఎంచుకోండి",

        // Order Tracking
        order_confirmed: "మీ ఆర్డర్ విజయవంతంగా నమోదైంది!",
        order_number: "ఆర్డర్ సంఖ్య",
        live_status: "ఆర్డర్ ప్రస్తుత స్థితి",
        order_timeline_placed: "కిచెన్‌కు ఆర్డర్ చేరింది",
        order_timeline_accepted: "రెస్టారెంట్ స్వీకరించింది",
        order_timeline_preparing: "మీ కోసం తాజా రెస్టారెంట్ వంటకాలు తయారవుతున్నాయి",
        order_timeline_ready: "మీ ఆర్డర్ రెడీగా ఉంది",
        order_timeline_served: "మీ రుచికరమైన భోజనాన్ని ఆనందించండి!",
        payment_status_pending: "చెల్లింపు బాకీ (కౌంటర్‌లో ఇవ్వండి)",
        payment_status_paid: "ఆన్‌లైన్ చెల్లింపు పూర్తయింది",

        // Admin & Management
        admin_dashboard: "అడ్మిన్ డాష్‌బోర్డ్",
        live_orders: "లైవ్ ఆర్డర్లు",
        kds_view: "కిచెన్ డిస్‌ప్లే",
        menu_management: "మెనూ & ధరలు",
        tables_qr: "టేబుల్స్ & క్యూఆర్",
        inventory_stock: "స్టాక్ & నిల్వలు",
        payments_cashier: "చెల్లింపులు & క్యాషియర్",
        sales_analytics: "అమ్మకాల విశ్లేషణ",
        audit_log: "ఆడిట్ లాగ్",
        login: "లాగిన్",
        logout: "లాగ్ అవుట్",
        store_settings: "స్టోర్ సెట్టింగ్స్",
        captain_pos: "కెప్టెన్ వెయిటర్ POS",
        cashier_pos: "క్యాషియర్ POS టెర్మినల్ ⚡",
        table_reservations: "టేబుల్ రిజర్వేషన్లు",
    },
};

export type TranslationKey = keyof typeof dictionary.en;
