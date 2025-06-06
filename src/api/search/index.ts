import type {
  AgreementDetailInterface,
  AgreementItemInterface,
  AgreementQueryInterface,
  ApartmentInterface,
  AppointmentInfoInterface,
  AppointmentItemInterface,
  AppointmentQueryInterface,
  GroupBlogItemInterface,
  HistoryItemInterface,
  PaymentInfoInterface,
  RegionInterface,
  RoomDetailInterface,
  RoomInterface,
  RoomListQueryInterface,
  TermInfoInterface,
  BlogLikeItemInterface,
  BlogCommentItemInterface
} from "@/api/search/types";
import type { PageRes, ReqPage } from "@/api/types";
import http from "@/utils/http";
import type { UserInfoInterface } from "@/api/user/types";
/**
 * @description 分页查询房间列表
 * @param params
 */
export function getRoomList(params: Partial<RoomListQueryInterface>) {
  return http.get<PageRes<RoomInterface>>(`/app/room/pageItem`, params);
}
/**
 * @description 查询省市区列表
 */
export function getRegionList() {
  return http.get<RegionInterface[]>(`/app/region/listAsTree`);
}
/**
 * @description 查询省份列表
 */
export function getProvinceList() {
  return http.get<RegionInterface[]>(`/app/region/province/list`);
}
/**
 * @description 查询城市列表
 * @param provinceId
 */
export function getCityList(provinceId: number | string) {
  return http.get<RegionInterface[]>(
    `/app/region/city/listByProvinceId?id=${provinceId}`
  );
}
/**
 * @description 查询区域列表
 * @param cityId
 */
export function getDistrictList(cityId: number | string) {
  return http.get<RegionInterface[]>(
    `/app/region/district/listByCityId?id=${cityId}`
  );
}
/**
 * @description 获取支付方式列表
 */
export function getPaymentTypeList() {
  return http.get<PaymentInfoInterface[]>(`/app/payment/list`);
}
/**
 * @description 根据id获取房间的详细信息
 * @param id
 */
export function getRoomDetailById(id: number | string) {
  return http.get<RoomDetailInterface>(`/app/room/getDetailById?id=${id}`);
}

/**
 * @description 根据id获取公寓信息
 */
export function getApartmentDetailById(id: number | string) {
  return http.get<ApartmentInterface>(`/app/apartment/getDetailById?id=${id}`);
}

/**
 * @description 根据公寓id分页查询房间列表
 * @param params
 */
export function getRoomListByApartmentId(
  params: ReqPage & { id: number | string }
) {
  return http.get<PageRes<RoomInterface>>(
    `/app/room/pageItemByApartmentId`,
    params
  );
}

/**
 * @description 保存或更新预约
 */
export function saveOrUpdateAppointment(params: AppointmentQueryInterface) {
  return http.post(`/app/appointment/saveOrUpdate`, params);
}

/**
 * @description 根据id查询预约详情信息
 * @param id
 */
export function getAppointmentDetailById(id: number | string) {
  return http.get<AppointmentInfoInterface>(
    `/app/appointment/getDetailById?id=${id}`
  );
}

/**
 * @description 查询我的预约列表
 */
export function getMyAppointmentList() {
  return http.get<AppointmentItemInterface[]>(`/app/appointment/listItem`);
}

/**
 * @description 获取个人租约基本信息列表
 */
export function getMyAgreementList() {
  return http.get<AgreementItemInterface[]>(`/app/agreement/listItem`);
}

/**
 * @description 根据id获取租约详细信息
 */
export function getAgreementDetailById(id: number | string) {
  return http.get<AgreementDetailInterface>(
    `/app/agreement/getDetailById?id=${id}`
  );
}

/**
 * @description 保存新租约
 */
export function saveOrUpdateAgreement(
  params: Partial<AgreementQueryInterface>
) {
  return http.post(`/app/agreement/saveOrUpdate`, params);
}

/**
 * @description 根据房间id获取可选获取租期列表
 * @param roomId
 */
export function getTermListByRoomId(roomId: number | string) {
  return http.get<TermInfoInterface[]>(`/app/term/listByRoomId?id=${roomId}`);
}
/**
 * @description 根据房间id获取可选支付方式列表
 * @param roomId
 */
export function getPaymentListByRoomId(roomId: number | string) {
  return http.get<PaymentInfoInterface[]>(
    `/app/payment/listByRoomId?id=${roomId}`
  );
}

/**
 * @description 获取浏览历史
 * @param params
 */
export function getHistoryList(params: ReqPage) {
  return http.get<PageRes<HistoryItemInterface>>(
    `/app/history/pageItem`,
    params
  );
}

/**
 * @description 获取圈子博文列表
 * @param params
 */
export function getGroupBlogList(params: ReqPage & { apartmentId?: number | string | undefined }) {
  return http.get<PageRes<GroupBlogItemInterface>>(
    `/app/group/pageItem`,
    params
  );
}

/**
 * @description 发布博文
 */
export function saveBlog(params: Partial<GroupBlogItemInterface>) {
  return http.post(`/app/group/saveBlog`, params);
}

/**
 * @description 根据id删除博文信息
 * @param id 博文id
 */
export function deleteBlogById(id: number | string) {
  return http.delete(`/app/group/removeBlogById?id=${id}`)
}

/**
 * @description 根据id修改博文点赞状态
 * @param id 博文id
 */
export function likeBlogById(id: number | string) {
  return http.put(`/app/group/like/${id}`);
}

/**
 * @description 根据id查询博文点赞列表前5名,在查询评论时触发
 * @param id 博文id
 */
export function queryBlogLikes(id: number | string) {
  return http.get<BlogLikeItemInterface[]>(`/app/group/likes/top5/${id}`);
}

/**
 * @description 根据id查询博文评论列表
 * @param id 博文id
 */
export function queryBlogCommentListById(id: number | string) {
  return http.get<BlogCommentItemInterface[]>(`/app/group/comments/${id}`);
}

/**
 * @description 提交博文评论
 * @param params 评论参数
 */
export function submitBlogComment(params: {
  blogId: number | string;
  content: string;
  parentId?: number | string | null;
  replyUserId?: number | string | null;
}) {
  return http.post(`/app/group/comment`, params);
}

/**
 * @description 删除博文评论
 * @param id 评论id
 */
export function deleteBlogComment(id: number | string) {
  return http.delete(`/app/group/removeComment/${id}`);
}

/**
 * @description 更新用户昵称,昵称不能超过20个字符，且是唯一的
 * @param nickname 昵称
 */
export function updateUserNickname(nickname: string) {
  return http.put(`/app/user/update/nickname?nickname=${nickname}`);
}

/**
 * @description 更新用户头像
 * @param avatarUrl 头像URL
 */
export function updateUserAvatar(avatarUrl: string) {
  return http.put(`/app/user/update/avatar?avatarUrl=${avatarUrl}`);
}

/**
 * @description 关注博主
 * @param id 博主id
 * @param isFollow 是否关注,true为关注,false为取消关注
 */
export function followUser(id: number | string, isFollow: boolean) {
  return http.put<boolean>(`/app/follow/${id}/${isFollow}`);
}

/**
 * @description 查询是否关注
 * @param id 博主id
 */
export function queryFollow(id: number | string) {
  return http.get<boolean>(`/app/follow/or/not/${id}`);
}

/**
 * @description 获取指定用户关注的用户信息列表
 * @param userId 指定用户id
 */
export function getFollowUserInfoList(id: number) {
  return http.get<UserInfoInterface[]>(`/app/follow/list/${id}`);
}

