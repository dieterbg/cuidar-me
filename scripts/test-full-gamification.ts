import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test user credentials
const TEST_EMAIL = 'testedbg@gmail.com';

interface GamificationData {
    totalPoints: number;
    level: string;
    badges: string[];
    weeklyProgress: {
        perspectives: {
            [key: string]: {
                current: number;
                goal: number;
                isComplete: boolean;
            }
        }
    }
}

async function getTestUser() {
    console.log('🔍 Finding test user...');
    const { data: authData } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: 'didi123'
    });

    if (!authData.user) {
        console.error('❌ Could not authenticate test user');
        return null;
    }

    const { data: patient } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

    return { user: authData.user, patient };
}

async function registerAction(userId: string, type: 'hydration' | 'mood', perspective: string) {
    console.log(`\n📝 Registering ${type} for perspective: ${perspective}`);

    // Fetch current patient data
    const { data: patientData, error: fetchError } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (fetchError || !patientData) {
        console.error('❌ Error fetching patient:', fetchError);
        return { success: false };
    }

    const patient = patientData as any;
    let pointsEarned = 0;
    let message = '';

    // Initialize gamification if needed
    if (!patient.gamification) {
        patient.gamification = {
            totalPoints: 0,
            level: 'Iniciante',
            badges: [],
            weeklyProgress: { perspectives: {} }
        };
    }

    // Determine points
    if (type === 'hydration') {
        pointsEarned = 10;
        message = `Hidratação registrada! +10 pontos 💧`;
    } else if (type === 'mood') {
        pointsEarned = 15;
        message = `Humor registrado! +15 pontos ☀️`;
    }

    // Update weekly progress for the perspective
    if (!patient.gamification.weeklyProgress.perspectives[perspective]) {
        patient.gamification.weeklyProgress.perspectives[perspective] = {
            current: 0,
            goal: 5,
            isComplete: false
        };
    }

    const perspectiveData = patient.gamification.weeklyProgress.perspectives[perspective];
    perspectiveData.current += 1;

    // Check if weekly goal is complete
    if (perspectiveData.current >= perspectiveData.goal && !perspectiveData.isComplete) {
        perspectiveData.isComplete = true;
        pointsEarned += 50;
        message += ' e Meta Semanal Concluída! 🚀';
    }

    // Update total points
    patient.gamification.totalPoints = (patient.gamification.totalPoints || 0) + pointsEarned;

    // Update level
    const oldLevel = patient.gamification.level;
    if (patient.gamification.totalPoints >= 2000) patient.gamification.level = 'Mestre';
    else if (patient.gamification.totalPoints >= 1000) patient.gamification.level = 'Veterano';
    else if (patient.gamification.totalPoints >= 500) patient.gamification.level = 'Praticante';

    if (patient.gamification.level !== oldLevel) {
        message = `PARABÉNS! Você subiu para o nível ${patient.gamification.level}! 🎉`;
    }

    // Save to database
    const { error: updateError } = await supabase
        .from('patients')
        .update({
            gamification: patient.gamification,
            total_points: patient.gamification.totalPoints,
            level: patient.gamification.level
        })
        .eq('user_id', userId);

    if (updateError) {
        console.error('❌ Error updating gamification:', updateError);
        return { success: false };
    }

    console.log(`✅ ${message}`);
    console.log(`   Total Points: ${patient.gamification.totalPoints}`);
    console.log(`   Level: ${patient.gamification.level}`);
    console.log(`   ${perspective} Progress: ${perspectiveData.current}/${perspectiveData.goal}`);

    return { success: true, pointsEarned, message };
}

async function runFullTest() {
    console.log('🎮 Starting Complete Gamification Test\n');
    console.log('='.repeat(60));

    const testUser = await getTestUser();
    if (!testUser) {
        console.error('❌ Test aborted: Could not get test user');
        return;
    }

    const { user, patient } = testUser;
    console.log(`✅ Test user found: ${patient.full_name}`);
    console.log(`   User ID: ${user.id}`);

    // Get initial state
    const { data: initialPatient } = await supabase
        .from('patients')
        .select('gamification')
        .eq('user_id', user.id)
        .single();

    console.log('\n📊 Initial State:');
    console.log(`   Points: ${initialPatient?.gamification?.totalPoints || 0}`);
    console.log(`   Level: ${initialPatient?.gamification?.level || 'Iniciante'}`);

    console.log('\n' + '='.repeat(60));
    console.log('🧪 Simulating Patient Interactions...\n');

    // Define test scenarios for each perspective
    const perspectives = [
        { key: 'alimentacao', name: 'Alimentação', type: 'mood' as const },
        { key: 'movimento', name: 'Movimento', type: 'mood' as const },
        { key: 'hidratacao', name: 'Hidratação', type: 'hydration' as const },
        { key: 'disciplina', name: 'Disciplina', type: 'mood' as const },
        { key: 'bemEstar', name: 'Bem-Estar', type: 'mood' as const }
    ];

    let totalPointsEarned = 0;

    // Simulate 5 check-ins for each perspective (to complete weekly goal)
    for (const perspective of perspectives) {
        console.log(`\n🎯 Testing Perspective: ${perspective.name}`);
        console.log('-'.repeat(60));

        for (let i = 1; i <= 5; i++) {
            console.log(`\n   Check-in ${i}/5:`);
            const result = await registerAction(user.id, perspective.type, perspective.key);
            if (result.success && result.pointsEarned) {
                totalPointsEarned += result.pointsEarned;
            }
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    // Get final state
    const { data: finalPatient } = await supabase
        .from('patients')
        .select('gamification')
        .eq('user_id', user.id)
        .single();

    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL RESULTS\n');
    console.log(`Initial Points: ${initialPatient?.gamification?.totalPoints || 0}`);
    console.log(`Final Points: ${finalPatient?.gamification?.totalPoints || 0}`);
    console.log(`Points Earned: ${totalPointsEarned}`);
    console.log(`Final Level: ${finalPatient?.gamification?.level || 'Iniciante'}`);

    console.log('\n🎯 Weekly Progress Summary:');
    const perspectives_data = finalPatient?.gamification?.weeklyProgress?.perspectives || {};
    Object.entries(perspectives_data).forEach(([key, data]: [string, any]) => {
        const status = data.isComplete ? '✅ COMPLETE' : '⏳ In Progress';
        console.log(`   ${key}: ${data.current}/${data.goal} ${status}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test Complete!\n');
}

runFullTest().catch(console.error);
