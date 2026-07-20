// backend/test-db.ts
import 'dotenv/config'; 
import { PrismaClient } from '../src/generated/prisma/client'; 
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Mock function to simulate your backend service-layer validation logic
async function createFriendshipRequest(senderId: string, receiverId: string) {
  // 1. Enforce a consistent lookup order (Lexicographical ordering check)
  const firstId = senderId < receiverId ? senderId : receiverId;
  const secondId = senderId < receiverId ? receiverId : senderId;

  // 2. Check if a relationship record already exists in either direction
  const existingFriendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { senderId: firstId, receiverId: secondId },
        { senderId: secondId, receiverId: firstId }
      ]
    }
  });

  if (existingFriendship) {
    throw new Error("Friendship relationship or pending request already exists between these users.");
  }

  // 3. Create the record if safe
  return await prisma.friendship.create({
    data: { senderId, receiverId, status: "PENDING" }
  });
}

async function testDatabase() {
  console.log("\n🚀 === STARTING DATABASE VALIDATION ===");

  try {
    // ----------------------------------------------------
    // SETUP TEST USERS
    // ----------------------------------------------------
    const userA = await prisma.user.create({ data: { email: "alpha@test.com", username: "UserAlpha" } });
    const userB = await prisma.user.create({ data: { email: "beta@test.com", username: "UserBeta" } });
    console.log("✅ Test users generated successfully");

    // ----------------------------------------------------
    // TEST 1: REVERSE FRIENDSHIP DUPLICATION BLOCK
    // ----------------------------------------------------
    console.log("\n--- Testing Reverse Friendship Logic ---");
    
    // Step A: User Alpha sends a request to User Beta (Valid)
    await createFriendshipRequest(userA.id, userB.id);
    console.log("✅ Step A: Alpha successfully sent a pending request to Beta.");

    // Step B: User Beta tries to send a request back to User Alpha (Should fail)
    try {
      await createFriendshipRequest(userB.id, userA.id);
      console.log("❌ TEST FAILED: The system allowed a duplicate reverse friendship row!");
    } catch (err: any) {
      console.log(`🏆 REVERSE FRIENDSHIP TEST PASSED: Backend correctly blocked the duplicate edge! Reason: "${err.message}"`);
    }

    // ----------------------------------------------------
    // TEST 2: AI MATCH VERIFICATION
    // ----------------------------------------------------
    console.log("\n--- Testing Game System Configuration ---");
    const aiMatch = await prisma.match.create({
      data: { homeId: userA.id, homeScore: 10, awayScore: 5, isAIGame: true }
    });
    console.log("✅ AI Match verification passed (awayPlayer left as null)");

    // ----------------------------------------------------
    // TEST 3: PvP MATCH VERIFICATION
    // ----------------------------------------------------
    const pvpMatch = await prisma.match.create({
      data: { homeId: userA.id, awayId: userB.id, homeScore: 11, awayScore: 9 }
    });
    console.log("✅ PvP Match verification passed");

    // ----------------------------------------------------
    // TEST 4: GDPR CLEAN ACCOUNT DELETION LOGIC
    // ----------------------------------------------------
    console.log("\n--- Testing Data Retention & Deletion Rules ---");
    // Delete User Alpha. The PvP match log details should update homeId to null instead of disappearing.
    await prisma.user.delete({ where: { id: userA.id } });
    
    const savedMatch = await prisma.match.findUnique({ where: { id: pvpMatch.id } });
    
    if (savedMatch && savedMatch.homeId === null && savedMatch.awayId === userB.id) {
      console.log("🏆 CRITICAL GDPR DELETION TEST PASSED: User deleted, match logs safely preserved!");
    } else {
      console.log("❌ TEST FAILED: Cascade rules accidentally purged game history.");
    }

    // Clean up remaining records
    await prisma.user.delete({ where: { id: userB.id } });

  } catch (error) {
    console.error("❌ Test script crashed unexpectedly:", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
    console.log("\n=== DATABASE TESTS EXECUTED COMPLETELY ===\n");
  }
}

testDatabase();

