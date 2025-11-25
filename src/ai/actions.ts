

// Re-export modular action groups
export * from './actions/patients';
export * from './actions/messages';
export * from './actions/protocols';
export * from './actions/videos';
export { saveTwilioCredentials, getTwilioCredentials } from './actions/system';

// Extended actions (community, gamification, etc.)
export * from './actions-extended';

// Seed database utility
export { seedDatabase } from './seed-database';

// AI Flow functions
export { generateProtocol } from './flows/generate-protocol';
export { suggestWhatsappReplies } from './flows/suggest-whatsapp-replies';
export { generateChatbotReply } from './flows/generate-chatbot-reply';
export { generatePatientSummary } from './flows/generate-patient-summary';
export { getChatAnalysis } from './flows/get-chat-analysis';
