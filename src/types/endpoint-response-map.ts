import type {
  AccessTokenResponse,
  GetArtistResponse,
  GetLabelResponse,
  GetMasterReleaseVersionsResponse,
  GetReleaseResponse,
  GetSearchResponse,
  GetUserCollectionFoldersResponse,
  GetUserIdentityResponse,
  GetUserProfileResponse,
  GetUserWantlistResponse,
  RequestTokenResponse,
} from "./endpoints/mod.ts";

export type EndpointResponseMap = {
  GET: {
    "/oauth/identity": GetUserIdentityResponse;
    "/users/{username}": GetUserProfileResponse;
    "/releases/{release_id}": GetReleaseResponse;
    "/artists/{artist_id}": GetArtistResponse;
    "/labels/{label_id}": GetLabelResponse;
    "/masters/{master_id}/versions": GetMasterReleaseVersionsResponse;
    "/database/search": GetSearchResponse;
    "/users/{username}/collection/folders": GetUserCollectionFoldersResponse;
    "/users/{username}/wants": GetUserWantlistResponse;
    [endpoint: string]: unknown;
  };
  PUT: {
    [endpoint: string]: unknown;
  };
  DELETE: {
    [endpoint: string]: unknown;
  };
  POST: {
    "/oauth/request_token": RequestTokenResponse;
    "/oauth/access_token": AccessTokenResponse;
    [endpoint: string]: unknown;
  };
};
