import server from './server.js';
import infoService from "./info.js";

async function syncNow() {
    const result = await server.post('sync/now');

    if (result.success) {
        infoService.showMessage("同步已成功完成。");
    }
    else {
        if (result.message.length > 50) {
            result.message = result.message.substr(0, 50);
        }

        infoService.showError("同步失败: " + result.message);
    }
}

$("#sync-now-button").click(syncNow);

async function forceNoteSync(noteId) {
    await server.post('sync/force-note-sync/' + noteId);

    infoService.showMessage("笔记添加到了同步队列。");
}

export default {
    syncNow,
    forceNoteSync
};