import { ApiService } from "./api";

// Re-export ApiService as StorageService for seamless backward compatibility
export const StorageService = ApiService;
export { ApiService };
