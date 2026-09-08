"use client";

import React from "react";
import { X, Sparkles, Flame, Heart, MapPin, Star } from "lucide-react";
import { ArabesqueDivider } from "./ArabiqBrandIcons";

interface OurStoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function OurStoryModal({ isOpen, onClose }: OurStoryModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
            <div
                className="bg-[#120E0A] border-2 border-amber-500/50 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl text-white flex flex-col animate-in zoom-in-95 max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 pb-4 border-b border-amber-500/20 flex items-center justify-between bg-gradient-to-r from-[#1A140F] via-[#241B13] to-[#1A140F]">
                    <div>
                        <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase font-bold block">
                            Our Heritage & Passion
                        </span>
                        <h3 className="font-serif text-2xl font-black text-[#F8F3EB]">
                            Surya Family Restaurant Kadiri
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-amber-400 flex items-center justify-center transition cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto">
                    <ArabesqueDivider className="my-1" />

                    <div className="relative rounded-2xl overflow-hidden border border-amber-500/30 h-48">
                        <img
                            src="/dishes/3d_biryani.jpg"
                            alt="Surya Family Restaurant Specialties"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#120E0A] via-transparent to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                            <span className="text-xs font-serif italic text-amber-300 font-bold">
                                "Kadiri's favorite place for biryani lovers & family dining."
                            </span>
                            <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-black/60 px-2 py-0.5 rounded-full">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> 4.8 Google Rated
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4 text-xs text-[#E2D4C0] leading-relaxed">
                        <p>
                            Welcome to <strong className="text-amber-400">SURYA FAMILY RESTAURANT (సూర్య ఫ్యామిలీ రెస్టారెంట్)</strong>, Kadiri's premier multi-cuisine dining destination located conveniently on Bypass Road, right opposite the RTC Bus Stand.
                        </p>
                        <p>
                            Rated <strong className="text-amber-300">4.8★ with over 69 reviews</strong>, we pride ourselves on hygiene, high-quality ingredients, and authentic flavors. From our signature slow-cooked <strong className="text-white">Hyderabadi Chicken Dum Biryani</strong> and sizzling <strong className="text-white">Tandoori Kebabs</strong> to our crowd-favorite <strong className="text-white">Punjabi Chicken Curry with Butter Naan</strong>, every meal is prepared to bring families together.
                        </p>
                    </div>

                    {/* 3 Pillars */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div className="p-3.5 rounded-2xl bg-[#1A140F] border border-amber-500/20 text-center">
                            <Flame className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
                            <h5 className="font-serif font-bold text-xs text-[#F8F3EB]">Charcoal Tandoor</h5>
                            <p className="text-[10px] text-[#A6957E] mt-0.5">Freshly baked butter naans & smoky tandoori grills</p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-[#1A140F] border border-amber-500/20 text-center">
                            <Sparkles className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
                            <h5 className="font-serif font-bold text-xs text-[#F8F3EB]">Pure Ingredients</h5>
                            <p className="text-[10px] text-[#A6957E] mt-0.5">Desi ghee, aged basmati & stone-ground spices</p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-[#1A140F] border border-amber-500/20 text-center">
                            <Heart className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
                            <h5 className="font-serif font-bold text-xs text-[#F8F3EB]">Family Comfort</h5>
                            <p className="text-[10px] text-[#A6957E] mt-0.5">Spacious AC family dining & courteous service</p>
                        </div>
                    </div>

                    {/* Kadiri Location */}
                    <div className="p-4 rounded-2xl bg-[#1A140F] border border-amber-500/30 flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="text-xs">
                            <h5 className="font-serif font-bold text-sm text-[#F8F3EB] mb-1">Our Kadiri Location:</h5>
                            <p className="text-[#C5B39A]">Dhandubatu Street, Bypass road, opposite to RTC Bus Stand, Police Quarters, Kadiri, Andhra Pradesh 515591</p>
                            <p className="text-amber-400 mt-1 font-mono font-bold">📞 098803 58634 | Timings: 11:00 AM – 10:30 PM (Daily)</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
