// types/memo.ts
export interface MemoUser {
    id: number;
    name: string;
    loginId: string;
    shareType?: 'view'|'edit';
}
  
export interface UploadFile {
    fileName: string;
    googleDriveFileId: string;
}
  
export interface Memo {
    seq: number;
    title: string;
    subject?: string;
    raws: string;
    answer: string;
    createdAt: string;
    modifiedAt: string;
    files: UploadFile[];
    insertId: number;
    // sharedIds?: number[];
    isSwiped: boolean;
    googleDriveFileId: string;
    insertUser?: MemoUser;
    sharedUsers?: MemoUser[]; 
}