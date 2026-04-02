"use server"

import connectDb from "@/app/db/connectDb";
import Event from "@/models/Event";
import User from "@/models/User";

export const createEventAction = async (eventData) => {
    try {
        await connectDb();

        const newEvent = new Event({
            title: eventData.title,
            eventType: eventData.eventType,
            details: eventData.details,
            organiser: eventData.organiser,
            posterUrl: eventData.posterUrl || '',
            eventDate: new Date(eventData.eventDate),
            timing: eventData.timing,
            locationType: eventData.locationType,
            locationDetails: eventData.locationDetails,
            creatorId: eventData.creatorId,
        });

        const savedEvent = await newEvent.save();

        // Ensure serialization
        return {
            success: true,
            event: JSON.parse(JSON.stringify(savedEvent))
        };
    } catch (error) {
        console.error("Error creating event:", error);
        return { success: false, error: error.message };
    }
};

export const fetchEventsByCategoryAction = async (category) => {
    try {
        await connectDb();

        // Convert slug (e.g., 'hackathon' -> 'Hackathon')
        // Using regex for case-insensitive match just in case
        const regex = new RegExp(`^${category}$`, 'i');

        const events = await Event.find({ eventType: { $regex: regex } })
            .populate('creatorId', 'name username profilepic')
            .sort({ eventDate: 1 }); // Sort by upcoming dates first

        return JSON.parse(JSON.stringify(events));
    } catch (error) {
        console.error(`Error fetching events for category ${category}:`, error);
        return [];
    }
};

export const fetchAllEventsAction = async () => {
    try {
        await connectDb();

        const events = await Event.find()
            .populate('creatorId', 'name username profilepic')
            .sort({ createdAt: -1 }); // Newly added first

        return JSON.parse(JSON.stringify(events));
    } catch (error) {
        console.error("Error fetching all events:", error);
        return [];
    }
};

export const deleteEventAction = async (eventId, userId) => {
    try {
        await connectDb();
        const event = await Event.findById(eventId);
        
        if (!event) return { success: false, error: "Event not found" };
        
        // Ownership check
        if (event.creatorId.toString() !== userId) {
            return { success: false, error: "Not authorized to delete this event" };
        }

        await Event.findByIdAndDelete(eventId);
        return { success: true };
    } catch (error) {
        console.error("Error deleting event:", error);
        return { success: false, error: error.message };
    }
};

export const updateEventAction = async (eventId, eventData, userId) => {
    try {
        await connectDb();
        const event = await Event.findById(eventId);
        
        if (!event) return { success: false, error: "Event not found" };

        // Ownership check
        if (event.creatorId.toString() !== userId) {
            return { success: false, error: "Not authorized to edit this event" };
        }

        const updatedEvent = await Event.findByIdAndUpdate(
            eventId,
            {
                title: eventData.title,
                eventType: eventData.eventType,
                details: eventData.details,
                organiser: eventData.organiser,
                posterUrl: eventData.posterUrl || '',
                eventDate: new Date(eventData.eventDate),
                timing: eventData.timing,
                locationType: eventData.locationType,
                locationDetails: eventData.locationDetails,
            },
            { new: true } // Return updated doc
        ).populate('creatorId', 'name username profilepic');

        return {
            success: true,
            event: JSON.parse(JSON.stringify(updatedEvent))
        };
    } catch (error) {
        console.error("Error updating event:", error);
        return { success: false, error: error.message };
    }
};
