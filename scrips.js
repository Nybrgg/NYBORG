// Platform funktionalitet
class Platform {
    constructor() {
        this.blocks = [];
        this.init();
    }
    
    init() {
        console.log('Platform initialiseret');
        this.setupEditor();
    }
    
    setupEditor() {
        const editorArea = document.getElementById('editor-area');
        // Editor logik her
    }
}

// Start platformen
document.addEventListener('DOMContentLoaded', () => {
    new Platform();
});
