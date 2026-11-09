import {File, Folder} from "./definitions";
import {CustomTreeItem} from "./styles";

export function buildTree(tree: (File | Folder)[]) {
    return tree.map((folder: File | Folder) => {
        const children = "children" in folder && folder.children.length > 0 && buildTree(folder?.children);
        return (
            <CustomTreeItem key={folder.id} itemId={folder.id} label={folder.name}>
                {children}
            </CustomTreeItem>
        );
    });
}

export const searchFolders = (folders: (Folder | File)[], search: string): (Folder | File)[] => {
    const filteredRows: (Folder | File)[] = [];

    folders.forEach((item) => {
        const matchName = item?.name?.toLowerCase().includes(search.toLowerCase());

        if ("children" in item && item.children.length > 0) {
            // A folder that matches by name keeps all of its content: the user searched for the folder itself.
            if (matchName) {
                filteredRows.push(item);
                return;
            }
            const filteredChildren = searchFolders(item.children, search);
            if (filteredChildren.length > 0) {
                filteredRows.push({...item, children: filteredChildren});
            }
        } else if (matchName) {
            filteredRows.push(item);
        }
    });

    return filteredRows
}

export const getFoldersAndFilesIds = (folders: (Folder | File)[]): string[] => {
    const ids: string[] = [];

    folders.forEach((item) => {
        if ("children" in item && item.children.length > 0) {
            const childrenIds = getFoldersAndFilesIds(item.children);
            ids.push(...childrenIds);
        }
        ids.push(item.id);
    });
    return ids
}

