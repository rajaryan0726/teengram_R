"use client";
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Search as SearchIcon, UserPlus, check as Check, Clock, UserCheck } from 'lucide-react';
import Sidebar from '../Components/Sidebar';
import { searchUsersAction, makefriend, fetchfriendrequest, fetchSentFriendRequestsAction } from '@/actions/useractions';
import { motion } from 'framer-motion';
import Link from 'next/link';

const SearchPage = () => {
    const { data: session } = useSession();
    const router = useRouter();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Connection Status Maps
    const [sentRequests, setSentRequests] = useState(new Set()); // Emails I sent to
    const [receivedRequests, setReceivedRequests] = useState(new Set()); // Emails who sent to me
    const [friends, setFriends] = useState(new Set()); // Emails I'm friends with

    useEffect(() => {
        if (!session) {
            router.push("/login");
            return;
        }
        fetchConnections();
    }, [session]);

    // Fetch existing connections to show correct button state
    const fetchConnections = async () => {
        if (!session?.user?.email) return;

        try {
            // 1. Get requests I RECEIVED (Pending & Accepted)
            const received = await fetchfriendrequest(session.user.email);

            const sentSet = new Set();
            const receivedSet = new Set();
            const friendSet = new Set();

            // Process received
            received.forEach(req => {
                if (req.request_accepted) {
                    friendSet.add(req.sender_email);
                } else {
                    receivedSet.add(req.sender_email);
                }
            });

            // 2. Get requests I SENT
            const sent = await fetchSentFriendRequestsAction(session.user.email);
            sent.forEach(req => {
                if (req.request_accepted) {
                    friendSet.add(req.reciever_email);
                } else {
                    sentSet.add(req.reciever_email);
                }
            });

            setSentRequests(sentSet);
            setReceivedRequests(receivedSet);
            setFriends(friendSet);

        } catch (error) {
            console.error("Error fetching connections:", error);
        }
    };

    const handleSearch = async (e) => {
        const val = e.target.value;
        setQuery(val);

        if (val.trim().length === 0) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        // Debounce could be added here, but direct call for responsiveness on small userbase is fine
        try {
            const users = await searchUsersAction(val, session?.user?.email);
            setResults(users);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const sendRequest = async (recipientEmail) => {
        if (!session?.user) return;

        // Optimistic UI Update
        setSentRequests(prev => new Set(prev).add(recipientEmail));

        try {
            await makefriend(session.user.email, recipientEmail, session.user.image);
            // Re-fetch to confirm/sync state if needed, or rely on optimistic
        } catch (error) {
            console.error("Failed to send request", error);
            // Revert on failure
            setSentRequests(prev => {
                const newSet = new Set(prev);
                newSet.delete(recipientEmail);
                return newSet;
            });
            alert("Failed to send friend request.");
        }
    };

    // Render Button based on relationship status
    const renderActionButton = (user) => {
        const email = user.email;

        if (friends.has(email)) {
            return (
                <button disabled className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium cursor-default">
                    <UserCheck size={18} />
                    <span>Friends</span>
                </button>
            );
        }

        if (receivedRequests.has(email)) {
            return (
                <Link href="/Notification">
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition-colors">
                        <UserPlus size={18} />
                        <span>Accept Request</span>
                    </button>
                </Link>
            );
        }

        if (sentRequests.has(email)) {
            return (
                <button disabled className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 rounded-lg font-medium cursor-default">
                    <Clock size={18} />
                    <span>Requested</span>
                </button>
            );
        }

        return (
            <button
                onClick={() => sendRequest(email)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg hover:scale-105 transition-all"
            >
                <UserPlus size={18} />
                <span>Add Friend</span>
            </button>
        );
    };

    return (
        <div className="flex bg-gray-50 min-h-screen">
            <Sidebar className="flex-1" />

            <main className="flex-1 p-4 lg:p-8 overflow-y-auto w-full">
                <div className="max-w-4xl mx-auto space-y-8">

                    {/* Header & Search Input */}
                    <div className="bg-white rounded-3xl shadow-xl p-8 border border-white/20 backdrop-blur-xl">
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-pink-500 mb-2">
                            Find Friends 🔍
                        </h1>
                        <p className="text-gray-500 mb-8">Search for people by name or @username to connect.</p>

                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <SearchIcon className="h-6 w-6 text-gray-400 group-focus-within:text-violet-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl 
                                           text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-500 
                                           focus:ring-4 focus:ring-violet-500/10 transition-all text-lg font-medium"
                                placeholder="Search by name or username..."
                                value={query}
                                onChange={handleSearch}
                            />
                            {isLoading && (
                                <div className="absolute inset-y-0 right-4 flex items-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-600"></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Results Grid */}
                    {results.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {results.map((user) => (
                                <motion.div
                                    key={user._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center border border-gray-100 hover:shadow-xl transition-shadow"
                                >
                                    <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-violet-500 to-pink-500 mb-4">
                                        <img
                                            src={user.profilepic || "https://via.placeholder.com/150"}
                                            alt={user.name}
                                            className="w-full h-full rounded-full object-cover border-2 border-white"
                                        />
                                    </div>

                                    <h3 className="text-xl font-bold text-gray-900 text-center truncate w-full">{user.name}</h3>
                                    <p className="text-violet-600 font-medium text-sm mb-4">@{user.username}</p>

                                    {user.institute_name && (
                                        <p className="text-gray-500 text-xs mb-4 text-center line-clamp-1">{user.institute_name}</p>
                                    )}

                                    <div className="mt-auto">
                                        {renderActionButton(user)}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : query.length > 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500 text-lg">No users found matching "{query}" 😕</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400 opacity-50">
                            <SearchIcon size={64} className="mb-4" />
                            <p className="text-lg">Start typing to find new friends!</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default SearchPage;
