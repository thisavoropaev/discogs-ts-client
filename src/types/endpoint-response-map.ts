import type {
  AccessTokenResponse,
  GetArtistReleasesResponse,
  GetArtistResponse,
  GetLabelReleasesResponse,
  GetLabelResponse,
  GetMasterReleaseResponse,
  GetMasterReleaseVersionsResponse,
  GetReleaseRatingByUserResponse,
  GetReleaseResponse,
  GetSearchResponse,
  GetUserCollectionFoldersResponse,
  GetUserCollectionItemsResponse,
  GetUserIdentityResponse,
  GetUserProfileResponse,
  GetUserWantlistResponse,
  RequestTokenResponse,
  UpdateReleaseRatingByUserResponse,
} from "./endpoints/mod.ts";

export type EndpointResponseMap = {
  GET: {
    "/oauth/identity": GetUserIdentityResponse;
    "/users/{username}": GetUserProfileResponse;
    "/releases/{release_id}": GetReleaseResponse;
    "/artists/{artist_id}": GetArtistResponse;
    "/artists/{artist_id}/releases": GetArtistReleasesResponse;
    "/labels/{label_id}": GetLabelResponse;
    "/labels/{label_id}/releases": GetLabelReleasesResponse;
    "/masters/{master_id}": GetMasterReleaseResponse;
    "/masters/{master_id}/versions": GetMasterReleaseVersionsResponse;
    "/releases/{release_id}/rating/{username}": GetReleaseRatingByUserResponse;
    "/database/search": GetSearchResponse;
    "/users/{username}/collection/folders": GetUserCollectionFoldersResponse;
    "/users/{username}/collection/folders/{folder_id}/releases":
      GetUserCollectionItemsResponse;
    "/users/{username}/wants": GetUserWantlistResponse;
    [endpoint: string]: unknown;
  };
  PUT: {
    "/releases/{release_id}/rating/{username}":
      UpdateReleaseRatingByUserResponse;
    [endpoint: string]: unknown;
  };
  DELETE: {
    "/releases/{release_id}/rating/{username}":
      UpdateReleaseRatingByUserResponse;
    [endpoint: string]: unknown;
  };
  POST: {
    "/oauth/request_token": RequestTokenResponse;
    "/oauth/access_token": AccessTokenResponse;
    [endpoint: string]: unknown;
  };
};
