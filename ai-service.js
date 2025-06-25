class AIService {
    async generateFromPrompt(prompt) {
        // Integration med OpenAI API
        return 'Genereret kode baseret på: ' + prompt;
    }
}
class BlockManager {
    createBlock(type, content) {
        return {
            id: Date.now(),
            type: type,
            content: content,
            parent: null
        };
    }
}
