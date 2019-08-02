import treeService from './tree.js';
import messagingService from './messaging.js';
import protectedSessionService from './protected_session.js';
import treeChangesService from './branches.js';
import treeUtils from './tree_utils.js';
import branchPrefixDialog from '../dialogs/branch_prefix.js';
import exportDialog from '../dialogs/export.js';
import importDialog from '../dialogs/import.js';
import treeCache from "./tree_cache.js";
import syncService from "./sync.js";
import hoistedNoteService from './hoisted_note.js';
import noteDetailService from './note_detail.js';
import clipboard from './clipboard.js';

class TreeContextMenu {
    constructor(node) {
        this.node = node;
    }

    getNoteTypeItems(baseCmd) {
        return [
            { title: "文本", cmd: baseCmd + "_text", uiIcon: "file" },
            { title: "代码", cmd: baseCmd + "_code", uiIcon: "terminal" },
            { title: "保存搜索", cmd: baseCmd + "_search", uiIcon: "search-folder" },
            { title: "关系图", cmd: baseCmd + "_relation-map", uiIcon: "map" },
            { title: "HTML笔记", cmd: baseCmd + "_render", uiIcon: "play" }
        ];
    }

    async getContextMenuItems() {
        const branch = await treeCache.getBranch(this.node.data.branchId);
        const note = await treeCache.getNote(this.node.data.noteId);
        const parentNote = await treeCache.getNote(branch.parentNoteId);
        const isNotRoot = note.noteId !== 'root';
        const isHoisted = note.noteId === await hoistedNoteService.getHoistedNoteId();

        // some actions don't support multi-note so they are disabled when notes are selected
        // the only exception is when the only selected note is the one that was right-clicked, then
        // it's clear what the user meant to do.
        const selNodes = treeService.getSelectedNodes();
        const noSelectedNotes = selNodes.length === 0
            || (selNodes.length === 1 && selNodes[0] === this.node);

        const insertNoteAfterEnabled = isNotRoot && !isHoisted && parentNote.type !== 'search';
        const insertChildNoteEnabled = note.type !== 'search';

        return [
            { title: "在新页签中打开", cmd: "openInTab", uiIcon: "empty", enabled: noSelectedNotes },
            { title: "新同级笔记 <kbd>Ctrl+O</kbd>", cmd: "insertNoteAfter", uiIcon: "plus",
                items: insertNoteAfterEnabled ? this.getNoteTypeItems("insertNoteAfter") : null,
                enabled: insertNoteAfterEnabled && noSelectedNotes },
            { title: "新子级笔记 <kbd>Ctrl+P</kbd>", cmd: "insertChildNote", uiIcon: "plus",
                items: insertChildNoteEnabled ? this.getNoteTypeItems("insertChildNote") : null,
                enabled: insertChildNoteEnabled && noSelectedNotes },
            { title: "删除 <kbd>Delete</kbd>", cmd: "delete", uiIcon: "trash",
                enabled: isNotRoot && !isHoisted && parentNote.type !== 'search' },
            { title: "----" },
            isHoisted ? null : { title: "提升笔记 <kbd>Ctrl-H</kbd>", cmd: "hoist", uiIcon: "empty", enabled: noSelectedNotes },
            !isHoisted || !isNotRoot ? null : { title: "降级笔记 <kbd>Ctrl-H</kbd>", cmd: "unhoist", uiIcon: "arrow-up" },
            { title: "编辑分支前缀 <kbd>F2</kbd>", cmd: "editBranchPrefix", uiIcon: "empty",
                enabled: isNotRoot && parentNote.type !== 'search' && noSelectedNotes},
            { title: "----" },
            { title: "保护子树", cmd: "protectSubtree", uiIcon: "shield-check", enabled: noSelectedNotes },
            { title: "取消保护子树", cmd: "unprotectSubtree", uiIcon: "shield-close", enabled: noSelectedNotes },
            { title: "----" },
            { title: "复制/克隆 <kbd>Ctrl+C</kbd>", cmd: "copy", uiIcon: "files",
                enabled: isNotRoot },
            { title: "剪切 <kbd>Ctrl+X</kbd>", cmd: "cut", uiIcon: "scissors",
                enabled: isNotRoot },
            { title: "粘贴(子级) <kbd>Ctrl+V</kbd>", cmd: "pasteInto", uiIcon: "clipboard",
                enabled: !clipboard.isEmpty() && note.type !== 'search' && noSelectedNotes },
            { title: "粘贴(同级)", cmd: "pasteAfter", uiIcon: "clipboard",
                enabled: !clipboard.isEmpty() && isNotRoot && parentNote.type !== 'search' && noSelectedNotes },
            { title: "----" },
            { title: "导出", cmd: "export", uiIcon: "empty",
                enabled: note.type !== 'search' && noSelectedNotes },
            { title: "导入", cmd: "importIntoNote", uiIcon: "empty",
                enabled: note.type !== 'search' && noSelectedNotes },
            { title: "----" },
            { title: "折叠子树 <kbd>Alt+-</kbd>", cmd: "collapseSubtree", uiIcon: "align-justify", enabled: noSelectedNotes },
            { title: "强制同步", cmd: "forceNoteSync", uiIcon: "refresh", enabled: noSelectedNotes },
            { title: "按字母顺序排序 <kbd>Alt+S</kbd>", cmd: "sortAlphabetically", uiIcon: "empty", enabled: noSelectedNotes }
        ].filter(row => row !== null);
    }

    async selectContextMenuItem(event, cmd) {
        if (cmd === 'openInTab') {
            const notePath = await treeUtils.getNotePath(this.node);

            noteDetailService.openInTab(notePath);
        }
        else if (cmd.startsWith("insertNoteAfter")) {
            const parentNoteId = this.node.data.parentNoteId;
            const isProtected = await treeUtils.getParentProtectedStatus(this.node);
            const type = cmd.split("_")[1];

            treeService.createNote(this.node, parentNoteId, 'after', {
                type: type,
                isProtected: isProtected
            });
        }
        else if (cmd.startsWith("insertChildNote")) {
            const type = cmd.split("_")[1];

            treeService.createNote(this.node, this.node.data.noteId, 'into', {
                type: type,
                isProtected: this.node.data.isProtected
            });
        }
        else if (cmd === "editBranchPrefix") {
            branchPrefixDialog.showDialog(this.node);
        }
        else if (cmd === "protectSubtree") {
            protectedSessionService.protectSubtree(this.node.data.noteId, true);
        }
        else if (cmd === "unprotectSubtree") {
            protectedSessionService.protectSubtree(this.node.data.noteId, false);
        }
        else if (cmd === "copy") {
            clipboard.copy(treeService.getSelectedOrActiveNodes(this.node));
        }
        else if (cmd === "cut") {
            clipboard.cut(treeService.getSelectedOrActiveNodes(this.node));
        }
        else if (cmd === "pasteAfter") {
            clipboard.pasteAfter(this.node);
        }
        else if (cmd === "pasteInto") {
            clipboard.pasteInto(this.node);
        }
        else if (cmd === "delete") {
            treeChangesService.deleteNodes(treeService.getSelectedOrActiveNodes(this.node));
        }
        else if (cmd === "export") {
            exportDialog.showDialog(this.node,"subtree");
        }
        else if (cmd === "importIntoNote") {
            importDialog.showDialog(this.node);
        }
        else if (cmd === "collapseSubtree") {
            treeService.collapseTree(this.node);
        }
        else if (cmd === "forceNoteSync") {
            syncService.forceNoteSync(this.node.data.noteId);
        }
        else if (cmd === "sortAlphabetically") {
            treeService.sortAlphabetically(this.node.data.noteId);
        }
        else if (cmd === "hoist") {
            hoistedNoteService.setHoistedNoteId(this.node.data.noteId);
        }
        else if (cmd === "unhoist") {
            hoistedNoteService.unhoist();
        }
        else {
            messagingService.logError("Unknown command: " + cmd);
        }
    }
}

export default TreeContextMenu;