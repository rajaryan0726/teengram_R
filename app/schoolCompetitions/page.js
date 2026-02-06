"use client";
import { Lightbulb, Brush, Code, BookOpen, Calendar, Tag } from "lucide-react";
import React from 'react';
import Sidebar from "../Components/Sidebar";
// --- Icon Mapping Function ---
const getCategoryIcon = (category) => {
    const baseClasses = "w-6 h-6 p-1 rounded-full text-white";
    switch (category) {
        case "Coding":
            return <Code className={`${baseClasses} bg-blue-500`} />;
        case "Art & Creativity":
            return <Brush className={`${baseClasses} bg-pink-500`} />;
        case "Quiz":
            return <BookOpen className={`${baseClasses} bg-green-500`} />;
        case "Innovation":
            return <Lightbulb className={`${baseClasses} bg-yellow-600`} />;
        default:
            return <Tag className={`${baseClasses} bg-gray-400`} />;
    }
};

export default function TeenArenaPage() {

    const schoolCompetitions = [
        {
            id: 1,
            title: "Young Coders League",
            desc: "A programming challenge for school students to showcase logic and creativity.",
            date: "Nov 15, 2025",
            category: "Coding",
        },
        {
            id: 2,
            title: "Artify",
            desc: "An art and design competition encouraging students to express ideas visually.",
            date: "Nov 25, 2025",
            category: "Art & Creativity",
        },
        {
            id: 3,
            title: "Quiz-O-Mania",
            desc: "Test your knowledge across science, current affairs, and general awareness.",
            date: "Dec 10, 2025",
            category: "Quiz",
        },
        {
            id: 4,
            title: "Innovation Sparks",
            desc: "Pitch your innovative ideas or school projects that solve real-world problems.",
            date: "Jan 8, 2026",
            category: "Innovation",
        },
    ];

    return (
<>
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            
            {/* Header Section */}
            <div className="max-w-4xl mx-auto mb-10 text-center">
                <h1 className="text-4xl font-extrabold text-teal-700 mb-3 flex items-center justify-center gap-3">
                    🏆 TeenArena for Schools
                </h1>
                <p className="text-gray-600 max-w-2xl mx-auto">
                    Explore exciting competitions for school students — from coding and art to quizzes and innovation challenges. Participate, learn, and shine among young talents across the nation!
                </p>
            </div>

            {/* Competitions Grid */}
            <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6" >
                {
                    schoolCompetitions.map((comp) => (
                        <div
                            key={comp.id}
                            // Styled Card: Rounded, shadowed, responsive hover effect
                            className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border-t-4 border-teal-400 transform hover:scale-[1.02]"
                        >
                            {/* Card Header (Icon and Title) */}
                            <div className="flex items-center gap-4 mb-4">
                                {/* 🚨 FIX: Use the icon mapper 🚨 */}
                                {getCategoryIcon(comp.category)} 
                                <h2 className="text-xl font-bold text-teal-800">{comp.title}</h2>
                            </div>
                            
                            {/* Description */}
                            <p className="text-gray-600 mb-5 text-base">{comp.desc}</p>
                            
                            {/* Metadata */}
                            <div className="space-y-2 pt-3 border-t border-gray-100">
                                {/* Date */}
                                <div className="flex items-center text-sm text-gray-500">
                                    <Calendar className="w-4 h-4 mr-2 text-teal-400" />
                                    <strong className="text-gray-700 mr-1">Date:</strong> {comp.date}
                                </div>
                                
                                {/* Category */}
                                <div className="flex items-center text-sm text-gray-500">
                                    <Tag className="w-4 h-4 mr-2 text-teal-400" />
                                    <strong className="text-gray-700 mr-1">Category:</strong> 
                                    <span className="font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                                        {comp.category}
                                    </span>
                                </div>
                            </div>

                            {/* Call to Action */}
                            <button className="mt-5 w-full bg-indigo-500 text-white font-semibold py-2 rounded-lg hover:bg-indigo-600 transition-colors">
                                View Details
                            </button>
                        </div>
                    ))
                }
            </div >
                   </div >
                   </>

    );
}