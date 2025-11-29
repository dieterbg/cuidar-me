
import { checkBadgeUnlocks, PatientStats } from '../src/lib/badge-unlock-logic';
import { BADGE_CATALOG } from '../src/lib/badge-catalog';

function runTests() {
    console.log('🧪 Testing Badge Unlock Logic...');

    // Mock Stats
    const mockStats: PatientStats = {
        streak: { current: 7, longest: 7 },
        points: { total: 550 },
        level: { current: 3 },
        perspectives: {
            alimentacao: { checkins: 5, perfectCheckins: 5 },
            movimento: { checkins: 20, perfectCheckins: 0 },
            hidratacao: { checkins: 30, perfectCheckins: 0 },
            disciplina: { checkins: 10, perfectCheckins: 0 },
            bemEstar: { checkins: 0, perfectCheckins: 0 }
        },
        community: { comments: 10, reactions: 50, posts: 0 },
        special: { perfectWeeks: 0, weightGoalReached: false }
    };

    const currentBadges: string[] = [];

    // Test 1: Should unlock streak_7
    const newBadges1 = checkBadgeUnlocks(currentBadges, mockStats);
    console.log('Test 1 (Streak 7):', newBadges1.includes('streak_7') ? '✅ PASS' : '❌ FAIL');

    // Test 2: Should unlock points_500
    console.log('Test 2 (Points 500):', newBadges1.includes('points_500') ? '✅ PASS' : '❌ FAIL');

    // Test 3: Should unlock movement badge (athlete)
    console.log('Test 3 (Athlete):', newBadges1.includes('athlete') ? '✅ PASS' : '❌ FAIL');

    // Test 4: Should unlock hydration badge
    console.log('Test 4 (Hydration):', newBadges1.includes('hydration_master') ? '✅ PASS' : '❌ FAIL');

    // Test 5: Should NOT unlock streak_14
    console.log('Test 5 (No Streak 14):', !newBadges1.includes('streak_14') ? '✅ PASS' : '❌ FAIL');

    console.log('\nSummary of unlocked badges:', newBadges1);
}

runTests();
