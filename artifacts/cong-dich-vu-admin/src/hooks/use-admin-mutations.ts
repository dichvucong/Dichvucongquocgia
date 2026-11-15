import { useQueryClient } from '@tanstack/react-query';
import {
  getGetCurrentImageQueryKey,
  getListAdminImagesQueryKey,
  useCompleteImageUpload,
  useDeleteAdminImage,
  useHideImage,
  usePublishImage,
  useRequestImageUpload,
} from '@workspace/api-client-react';

export function useInvalidateAdmin() {
  const qc = useQueryClient();
  return () => Promise.all([
    qc.invalidateQueries({ queryKey: getListAdminImagesQueryKey() }),
    qc.invalidateQueries({ queryKey: getGetCurrentImageQueryKey() }),
  ]);
}

export function useAdminMutations() {
  const invalidate = useInvalidateAdmin();
  const settled = { mutation: { onSettled: () => { void invalidate(); } } };
  return {
    requestUpload: useRequestImageUpload(),
    complete: useCompleteImageUpload(settled),
    publish: usePublishImage(settled),
    hide: useHideImage(settled),
    remove: useDeleteAdminImage(settled),
  };
}
