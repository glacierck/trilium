import libraryLoader from "../services/library_loader.js";
import infoService from "../services/info.js";
import utils from "../services/utils.js";
import noteDetailService from "../services/note_detail.js";

const $dialog = $('#markdown-import-dialog');
const $importTextarea = $('#markdown-import-textarea');
const $importButton = $('#markdown-import-button');

async function convertMarkdownToHtml(text) {
    await libraryLoader.requireLibrary(libraryLoader.COMMONMARK);

    const reader = new commonmark.Parser();
    const writer = new commonmark.HtmlRenderer();
    const parsed = reader.parse(text);

    const result = writer.render(parsed);

    const textEditor = noteDetailService.getActiveEditor();
    const viewFragment = textEditor.data.processor.toView(result);
    const modelFragment = textEditor.data.toModel(viewFragment);

    textEditor.model.insertContent(modelFragment, textEditor.model.document.selection);

    infoService.showMessage("Markdown内容已导入文档");
}

async function importMarkdownInline() {
    if (utils.isElectron()) {
        const {clipboard} = require('electron');
        const text = clipboard.readText();

        convertMarkdownToHtml(text);
    }
    else {
        $("input[name='search-text']").focus();

        glob.activeDialog = $dialog;

        $dialog.modal();
    }
}

async function sendForm() {
    const text = $importTextarea.val();

    $dialog.modal('hide');

    await convertMarkdownToHtml(text);

    $importTextarea.val('');
}

$importButton.click(sendForm);

$dialog.bind('keydown', 'ctrl+return', sendForm);

// for CKEditor integration (button on block toolbar)
window.glob.importMarkdownInline = importMarkdownInline;

export default {
    importMarkdownInline
};