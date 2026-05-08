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
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg hover:scale-105 transition-all"
            >
                <UserPlus size={18} />
                <span>Add Friend</span>
            </button>
        );
    };

    return (
        <div className="flex bg-transparent h-screen w-full overflow-hidden">
            <Sidebar className="flex-1" />

            <main className="flex-1 p-2 lg:p-8 overflow-y-auto w-full pb-20 md:pb-8 relative z-10">
                <div className="max-w-4xl mx-auto space-y-4 lg:space-y-8 mt-12">

                    {/* Header & Search Input */}
                    <div className="glass-panel rounded-[2rem] p-4 lg:p-8 hover-3d transition-all">
                        <h1 className="text-3xl lg:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500 mb-2 text-center lg:text-left drop-shadow-sm">
                            Find Friends 🔍
                        </h1>
                        <p className="hidden md:block text-slate-500 dark:text-slate-400 font-bold mb-8">Search for people by name or @username to connect.</p>

                        <div className="relative group mt-4 lg:mt-0">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <SearchIcon className="h-5 w-5 lg:h-6 lg:w-6 text-slate-400 group-focus-within:text-cyan-500 transition-colors drop-shadow-md" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 lg:pl-12 pr-4 py-3 lg:py-4 bg-white/40 dark:bg-black/20 border border-white/50 dark:border-white/10 rounded-xl lg:rounded-2xl 
                                           text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 
                                           focus:ring-2 focus:ring-cyan-500/20 transition-all text-base lg:text-lg font-bold shadow-inner"
                                placeholder="Search friends..."
                                value={query}
                                onChange={handleSearch}
                            />
                            {isLoading && (
                                <div className="absolute inset-y-0 right-4 flex items-center">
                                    <div className="animate-spin rounded-full h-4 w-4 lg:h-5 lg:w-5 border-b-2 border-cyan-500"></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Results Grid */}
                    {results.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                            {results.map((user) => (
                                <motion.div
                                    key={user._id}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="glass-card rounded-[1.5rem] p-4 lg:p-6 flex flex-col items-center hover-3d transition-all"
                                >
                                    <Link href={{ pathname: '/ViewFriends', query: { friend_email: user.email, user_email: session.user.email } }} className="w-full flex flex-col items-center cursor-pointer">
                                        <div className="w-16 h-16 lg:w-24 lg:h-24 rounded-full p-1 bg-gradient-to-tr from-blue-500 to-cyan-400 mb-4 shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-transform hover:scale-105">
                                            <img
                                                src={user.profilepic || "https://via.placeholder.com/150"}
                                                alt={user.name}
                                                className="w-full h-full rounded-full object-cover border-2 border-white/80"
                                            />
                                        </div>

                                        <h3 className="text-lg lg:text-xl font-black text-slate-900 dark:text-white text-center truncate w-full hover:text-cyan-500 transition-colors drop-shadow-sm">{user.name}</h3>
                                        <p className="text-blue-600 dark:text-cyan-400 font-bold text-xs lg:text-sm mb-4">@{user.username}</p>

                                        {user.institute_name && (
                                            <p className="hidden md:block text-slate-500 font-medium text-xs mb-4 text-center line-clamp-1">{user.institute_name}</p>
                                        )}
                                    </Link>

                                    <div className="mt-auto w-full flex justify-center" onClick={(e) => e.stopPropagation()}>
                                        {renderActionButton(user)}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : query.length > 0 ? (
                        <div className="text-center py-12 glass-panel rounded-[2rem]">
                            <p className="text-slate-500 font-bold text-lg">No users found matching "{query}" 😕</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400 opacity-60 glass-panel rounded-[2rem]">
                            <SearchIcon size={64} className="mb-4 drop-shadow-md" />
                            <p className="text-lg font-bold">Start typing to find new friends!</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default SearchPage;
