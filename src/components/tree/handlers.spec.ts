import {searchFolders, getFoldersAndFilesIds} from "./handlers";

describe("searchFolders", () => {
    it("search folders correctly", () => {
        const folders = [
            {
                id: "1",
                name: "Some Folder 1",
                children: [
                    {
                        id: "2",
                        name: "Some File 1",
                        size: "10 KB",
                        type: "file",
                        fileType: "jpeg",
                        url: "s3_bucket_url",
                    },
                ],
            },
            {
                id: "3",
                name: "Some Folder 2",
                children: [
                    {
                        id: "4",
                        name: "searched Some File 2",
                        size: "10 KB",
                        type: "file",
                        fileType: "jpeg",
                        url: "s3_bucket_url"
                    },
                ],
            },
        ];

        const foundFolders = searchFolders(folders, "searched");
        expect(foundFolders).toEqual([folders[1]]);
    });
});

describe("searchFolders: folder matches", () => {
    const folders = [
        {
            id: "1",
            name: "Invoices",
            children: [
                {id: "11", name: "march.pdf", size: "10 KB", type: "file", fileType: "application/pdf", url: "s3_bucket_url"},
                {id: "12", name: "april.pdf", size: "12 KB", type: "file", fileType: "application/pdf", url: "s3_bucket_url"},
            ],
        },
        {id: "2", name: "Photos", children: []},
    ];

    it("keeps the whole content of a folder that matches by name", () => {
        expect(searchFolders(folders, "invoices")).toEqual([folders[0]]);
    });

    it("is case-insensitive and keeps only matching files inside non-matching folders", () => {
        expect(searchFolders(folders, "MARCH")).toEqual([{...folders[0], children: [folders[0].children[0]]}]);
    });

    it("returns an empty list when nothing matches", () => {
        expect(searchFolders(folders, "nothing")).toEqual([]);
    });
});

describe("getFoldersAndFilesIds", () => {
    it("collects ids of every nested folder and file", () => {
        const tree = [{id: "1", name: "a", children: [{id: "2", name: "b", children: [{id: "3", name: "c.txt", size: "1 KB", type: "file", fileType: "text/plain", url: ""}]}]}];
        expect(getFoldersAndFilesIds(tree).sort()).toEqual(["1", "2", "3"]);
    });
});
