import type {
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
    "/users/{username}/wantlist": GetUserWantlistResponse;
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
    [endpoint: string]: unknown;
  };
};
