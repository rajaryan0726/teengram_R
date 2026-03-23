import { createClient } from 'redis';

let redisClient;

export const getRedisClient = async () => {
    if (redisClient && redisClient.isOpen) {
        return redisClient;
    }

    console.log("Initializing Redis Client...");
    const client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    client.on('error', (err) => console.log('Redis Client Error', err));
    
    await client.connect();
    redisClient = client;
    
    return redisClient;
};
