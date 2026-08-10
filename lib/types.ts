export interface Group {
  id: string;
  name: string;
  position: number;
  createdAt: string;
  _count?: { books: number };
}

export interface Brain {
  id: string;
  createdAt: string;
}

export interface Book {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  fileName: string;
  fileSize: number;
  hasCustomCover: boolean;
  downloadCount: number;
  groupId: string | null;
  group?: Group | null;
  createdAt: string;
  updatedAt: string;
}
