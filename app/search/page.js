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
        <div className="flex bg-gray-50 dark:bg-black h-screen w-full overflow-hidden">
            <Sidebar className="flex-1" />

            <main className="flex-1 p-2 lg:p-8 overflow-y-auto w-full pb-20 md:pb-8">
                <div className="max-w-4xl mx-auto space-y-4 lg:space-y-8">

                    {/* Header & Search Input */}
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl lg:rounded-3xl shadow-xl p-4 lg:p-8 border border-white/20 dark:border-neutral-800 backdrop-blur-xl">
                        <h1 className="text-2xl lg:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-500 mb-1 lg:mb-2 text-center lg:text-left">
                            Find Friends 🔍
                        </h1>
                        <p className="hidden md:block text-gray-500 dark:text-neutral-400 mb-8">Search for people by name or @username to connect.</p>

                        <div className="relative group mt-4 lg:mt-0">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <SearchIcon className="h-5 w-5 lg:h-6 lg:w-6 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 lg:pl-12 pr-4 py-3 lg:py-4 bg-gray-50 dark:bg-neutral-800 border-2 border-gray-100 dark:border-neutral-700 rounded-xl lg:rounded-2xl 
                                           text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 
                                           focus:ring-4 focus:ring-blue-500/10 transition-all text-base lg:text-lg font-medium"
                                placeholder="Search friends..."
                                value={query}
                                onChange={handleSearch}
                            />
                            {isLoading && (
                                <div className="absolute inset-y-0 right-4 flex items-center">
                                    <div className="animate-spin rounded-full h-4 w-4 lg:h-5 lg:w-5 border-b-2 border-blue-600"></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Results Grid */}
                    {results.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
                            {results.map((user) => (
                                <motion.div
                                    key={user._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white dark:bg-neutral-900 rounded-2xl shadow-md p-3 lg:p-6 flex flex-col items-center border border-gray-100 dark:border-neutral-800 hover:shadow-xl transition-shadow"
                                >
                                    <Link href={{ pathname: '/ViewFriends', query: { friend_email: user.email, user_email: session.user.email } }} className="w-full flex flex-col items-center cursor-pointer">
                                        <div className="w-16 h-16 lg:w-24 lg:h-24 rounded-full p-1 bg-gradient-to-tr from-blue-500 to-blue-500 mb-2 lg:mb-4 transition-transform hover:scale-105">
                                            <img
                                                src={user.profilepic || "https://via.placeholder.com/150"}
                                                alt={user.name}
                                                className="w-full h-full rounded-full object-cover border-2 border-white"
                                            />
                                        </div>

                                        <h3 className="text-base lg:text-xl font-bold text-gray-900 dark:text-white text-center truncate w-full hover:text-blue-600 transition-colors">{user.name}</h3>
                                        <p className="text-blue-600 font-medium text-xs lg:text-sm mb-2 lg:mb-4">@{user.username}</p>

                                        {user.institute_name && (
                                            <p className="hidden md:block text-gray-500 text-xs mb-4 text-center line-clamp-1">{user.institute_name}</p>
                                        )}
                                    </Link>

                                    <div className="mt-auto w-full flex justify-center" onClick={(e) => e.stopPropagation()}>
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
