
import { handleOnboardingReply } from '../src/ai/actions/onboarding';

async function test() {
    console.log('--- Simulating "Não" response for Dieter bg ---');
    const result = await handleOnboardingReply(
        'bbc2bbda-c1e0-4745-97c4-8eda91e9dd3f',
        'whatsapp:+5551998770099',
        'Não',
        'Dieter bg'
    );
    console.log('Result:', JSON.stringify(result, null, 2));
}

test().catch(console.error);
