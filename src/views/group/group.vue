<template>
  <div class="bg-[--color-block-background]">

    <!-- 选项栏 -->
    <div class="sticky top-0 z-40 bg-white shadow-sm rounded-b-lg">
      <div class="w-[260px] mx-auto flex border-b">
        <div 
          class="flex-1 py-[10px] text-center font-bold text-[15px] transition-all duration-300 relative rounded-lg mx-1 tracking-wide"
          style="font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;"
          :class="{ 
            'text-[#006241]': tabActive === 'public', 
            'text-gray-500': tabActive !== 'public' 
          }"
          @click="changeTab('public')"
        >
          <van-icon name="fire-o" class="mr-1 align-middle" size="16" />
          <span class="font-bold">广场</span>
          <div v-if="tabActive === 'public'" class="absolute bottom-0 left-[25%] w-[50%] h-[4px] bg-[#006241] transition-all duration-300 rounded-full"></div>
        </div>
        <div 
          class="flex-1 py-[10px] text-center font-bold text-[15px] transition-all duration-300 relative rounded-lg mx-1 tracking-wide"
          style="font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;"
          :class="{ 
            'text-[#006241]': tabActive === 'apartment', 
            'text-gray-500': tabActive !== 'apartment' 
          }"
          @click="changeTab('apartment')"
        >
          <van-icon name="home-o" class="mr-1 align-middle" size="16" />
          <span class="font-bold">{{ userApartmentName || '公寓' }}</span>
          <div v-if="tabActive === 'apartment'" class="absolute bottom-0 left-[25%] w-[50%] h-[4px] bg-[#006241] transition-all duration-300 rounded-full"></div>
        </div>
      </div>
    </div>

    <!-- 发布博文按钮 -->
    <div class="fixed right-[20px] bottom-[60px] z-50 flex items-center justify-center" @click="blogPublishHandle">
      <div class="animate-float bg-[#006241] rounded-full p-[14px] shadow-2xl transform hover:scale-110 transition-all duration-300">
        <van-icon name="plus" size="24" class="text-white" />
      </div>
    </div>
    
    <PullDownRefreshContainer
      :request="getGroupBlogListHandler"
      ref="pullDownRefreshContainerRef"
      class="min-h-[70vh]"
    >

      <!--   圈子背景图 -->
      <van-image :src="bgImgUrl">
        <template v-slot:error>加载失败</template>
        <template v-slot:loading>
          <van-loading type="spinner" size="20" />
        </template>
      </van-image>

      <!-- 当选择公寓博文但用户没有公寓时显示提示 -->
      <div v-if="tabActive === 'apartment' && !hasApartment" class="flex flex-col items-center justify-center p-6 mt-4">
        <van-icon name="home-o" size="60" class="text-gray-400 mb-3" />
        <div class="text-gray-500 text-center">您当前没有关联的公寓</div>
        <div class="text-gray-400 text-center text-sm mt-1">入住公寓后可查看所在公寓的博文</div>
      </div>

      <!--   圈子博文列表 -->
      <div v-else>
        <div v-for="item in blogList" :key="item.id" class="mt-[15px]">
          <div class="bg-[--color-background-3] main-container py-[10px]">
            <!--          头像、昵称、姓名-->
            <div class="flex">
              <van-image
                round
                width="12vw"
                height="12vw"
                v-bind:src="item?.avatarUrl || defaultAvatarUrl"
              >
                <template v-slot:error>加载失败</template>
                <template v-slot:loading>
                  <van-loading type="spinner" size="20" />
                </template>
              </van-image>
              <div class="flex flex-col justify-center ml-[10px] text-[12px]">
                <div class="font-bold">{{ item.name }}</div>
                <div class="--van-gray-6">{{ item.publishTime }}</div>
              </div>
              <!-- 关注按钮, 只有当前用户不是博主时显示 -->
              <div class="flex-1 flex justify-end" v-if="!isCurrentUserBlog(item)">
                <van-button 
                  :type="item.isFollowed ? 'default' : 'primary'" 
                  size="small" 
                  @click="handleFollow(item)" 
                  class="ml-auto transition-all duration-300"
                >
                  {{ item.isFollowed ? '取消关注' : '关注' }}
                </van-button>
              </div>
            </div>
            <!--          正文-->
            <div class="mt-[10px] flex flex-col">
              <div class="font-bold">{{ item.title }}</div>
              <div
                class="van-multi-ellipsis--l3"
                v-on-click-remove-class="['van-multi-ellipsis--l3']"
              >
                {{ item.content }}
              </div>
              <!--            图片-->
              <van-row>
                <van-col
                  :span="8"
                  v-for="(urlItem, urlIndex) in item.graphVoList || []"
                  :key="`${item.id}-${urlIndex}-${urlItem.url}`"
                >
                  <van-image 
                    width="25vw" 
                    height="25vw" 
                    :src="urlItem.url"
                    @click="previewImages(item.graphVoList, urlIndex)"
                  >
                    <template v-slot:error>加载失败</template>
                    <template v-slot:loading>
                      <van-loading type="spinner" size="20" />
                    </template>
                  </van-image>
                </van-col>
              </van-row>
              <!--            点赞数、评论数-->
              <div class="flex flex-col mt-[10px] space-y-2">
                <!-- 点赞行：图标、数量和前5个点赞用户头像 -->
                <div class="flex items-center">
                  <div class="flex items-center">
                    <van-icon 
                      :name="item.isLike ? 'like' : 'like-o'" 
                      size="20" 
                      @click="likeBlog(item)" 
                      :color="item.isLike ? '#ff4d4f' : '#666'"
                    />
                    <div class="ml-[5px]">{{ item.liked }}</div>
                  </div>
                  
                  <!-- 点赞用户头像列表 -->
                  <div class="flex ml-3 overflow-hidden" v-if="item.likeUsers && item.likeUsers.length > 0">
                    <van-image
                      v-for="(user, index) in item.likeUsers"
                      :key="`like-${item.id}-${index}`"
                      round
                      width="20px"
                      height="20px"
                      :src="user.avatarUrl || defaultAvatarUrl"
                      class="mr-1"
                    />
                  </div>
                </div>
                
                <!-- 评论行：图标、数量和删除选项 -->
                <div class="flex items-center">
                  <div class="flex items-center">
                    <van-icon 
                      name="comment-o" 
                      size="20" 
                      @click="showCommentSection(item)" 
                    />
                    <div class="ml-[5px]">{{ item.comments }}</div>
                  </div>
                  
                  <!-- 删除按钮（仅对自己的博文显示） -->
                  <div class="flex ml-[10px]" v-if="isCurrentUserBlog(item)">
                    <van-icon name="delete-o" size="20" @click="handleDelete(item.id)" class="text-[#8B0000]" />
                  </div>
                </div>
                
                <!-- 评论区域 - 默认隐藏，点击评论图标后显示 -->
                <div v-if="item.showComments" class="mt-2 pt-2 border-t border-gray-200">
                  <!-- 评论列表 -->
                  <div v-if="item.commentList && item.commentList.length > 0" class="mb-3">
                    <div v-for="comment in item.commentList" :key="comment.id" class="mb-2 text-sm">
                      <div class="flex items-start">
                        <van-image
                          round
                          width="20px"
                          height="20px"
                          :src="comment.avatarUrl || defaultAvatarUrl"
                          class="mr-2 mt-1"
                        />
                        <div class="flex-1">
                          <!-- 用户信息单独一行 -->
                          <div class="flex items-center mb-1">
                            <span class="font-bold">{{ comment.nickname }}</span>
                            <div class="flex-1"></div>
                            <span class="text-xs text-gray-400">{{ comment.createTime }}</span>
                          </div>
                          
                          <!-- 评论内容 - 点击触发回复，长按触发删除 -->
                          <div 
                            class="comment-text"
                            @click="replyComment(item, comment)" 
                            @touchstart="handleCommentTouchStart($event, item, comment)"
                            @touchend="handleCommentTouchEnd"
                          >
                            <!-- 如果是回复其他评论，显示回复前缀 -->
                            <template v-if="comment.replyUserId">
                              <span class="text-blue-400 font-medium">回复 @{{ comment.replyUserNickname || '用户' }}: </span>
                            </template>
                            {{ comment.content }}
                          </div>
                          
                          <!-- 嵌套评论 -->
                          <div v-if="comment.children && comment.children.length > 0" class="ml-4 mt-2">
                            <div 
                              v-for="childComment in comment.children" 
                              :key="childComment.id" 
                              class="mb-2"
                            >
                              <!-- 子评论用户信息单独一行 -->
                              <div class="flex items-center mb-1">
                                <span class="font-bold">{{ childComment.nickname }}</span>
                                <div class="flex-1"></div>
                                <span class="text-xs text-gray-400">{{ childComment.createTime }}</span>
                              </div>
                              
                              <!-- 子评论内容 - 点击触发回复，长按触发删除 -->
                              <div 
                                class="comment-text"
                                @click="replyComment(item, childComment)"
                                @touchstart="handleCommentTouchStart($event, item, childComment)"
                                @touchend="handleCommentTouchEnd"
                              >
                                <!-- 如果是回复其他评论，显示回复前缀 -->
                                <template v-if="childComment.replyUserId">
                                  <span class="text-blue-400 font-medium">回复 @{{ childComment.replyUserNickname || '用户' }}: </span>
                                </template>
                                {{ childComment.content }}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- 评论输入框 -->
                  <div class="flex flex-col w-full">
                    <!-- 显示回复对象（如果有） -->
                    <div v-if="item.replyToComment" class="text-xs text-blue-400 px-2 pt-1 pb-0.5">
                      回复 {{ item.replyToComment.nickname }}
                      <van-icon 
                        name="cross" 
                        class="ml-1" 
                        @click="cancelReply(item)" 
                        size="12"
                      />
                    </div>
                    <van-field
                      v-model="item.commentContent"
                      :placeholder="item.replyToComment ? '写下你的回复...' : '写下你的评论...'"
                      :border="true"
                      :autofocus="true"
                      class="flex-1"
                    >
                      <template #button>
                        <van-button 
                          size="small" 
                          type="primary" 
                          @click="submitComment(item)"
                          :disabled="!item.commentContent"
                        >
                          发送
                        </van-button>
                      </template>
                    </van-field>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PullDownRefreshContainer>
  </div>
</template>

<script setup lang="ts" name="Group">
import { ref, watch, onMounted, reactive } from "vue";
import bgImgUrl from "@/assets/group_bg.png";
import type { PullDownRefreshContainer } from "@/components/PullDownRefreshContainer";
import type { ReqPage } from "@/api/types";
import { 
  getGroupBlogList, 
  deleteBlogById, 
  likeBlogById, 
  getMyAgreementList, 
  queryBlogLikes, 
  queryBlogCommentListById,
  submitBlogComment,
  deleteBlogComment,
  followUser,
  queryFollow
} from "@/api/search";
import type { GroupBlogItemInterface, AgreementItemInterface, BlogLikeItemInterface, BlogCommentItemInterface } from "@/api/search/types";
import { showToast, showDialog, showImagePreview, Field as VanField, Button as VanButton } from 'vant';
import { useRouter, useRoute } from "vue-router";
import defaultAvatarUrl from "../../../public/favicon.ico";
import { useUserStore } from "@/store/modules/user";
import http from "@/utils/http";

// 扩展GroupBlogItemInterface类型，添加前端需要的额外属性
interface ExtendedGroupBlogItem extends GroupBlogItemInterface {
  showComments?: boolean;
  commentContent?: string;
  likeUsers?: BlogLikeItemInterface[];
  commentList?: BlogCommentItemInterface[];
  replyToComment?: BlogCommentItemInterface;
  isFollowed?: boolean; // 是否已关注
}

const userStore = useUserStore();
const router = useRouter();
const route = useRoute();
const pullDownRefreshContainerRef = ref<InstanceType<typeof PullDownRefreshContainer>>();

// 圈子博文列表
const blogList = ref<ExtendedGroupBlogItem[]>([]);
// 记录已加载的博文ID,防止分页时重复加载
const loadedBlogIds = new Set<number>();
// 当前激活的标签页
const tabActive = ref<'public' | 'apartment'>('public');
// 用户当前公寓ID
const userApartmentId = ref<number | string | undefined>(undefined);
// 用户是否有公寓
const hasApartment = ref(false);
// 用户公寓名称
const userApartmentName = ref<string | undefined>(undefined);

// 加载用户公寓信息
const loadUserApartmentInfo = async () => {
  try {
    const { data } = await getMyAgreementList();
    // 检查是否有状态为2或5的租约（正常在租或退租待确认）
    const activeAgreement = data.find(item => 
      item.leaseStatus === '2' || 
      item.leaseStatus === 2 || 
      item.leaseStatus === '5' || 
      item.leaseStatus === 5
    );
    
    if (activeAgreement) {
      hasApartment.value = true;
      userApartmentId.value = activeAgreement.apartmentId;
      userApartmentName.value = activeAgreement.apartmentName;
    } else {
      hasApartment.value = false;
      userApartmentId.value = undefined;
      userApartmentName.value = undefined;
    }
  } catch (error) {
    console.error('获取用户公寓信息失败:', error);
    hasApartment.value = false;
    userApartmentId.value = undefined;
    userApartmentName.value = undefined;
  }
};

// 组件挂载时加载用户公寓信息
onMounted(loadUserApartmentInfo);

// 切换标签页
const changeTab = (tab: 'public' | 'apartment') => {
  if (tabActive.value !== tab) {
    tabActive.value = tab;
    // 清空列表重新加载
    blogList.value = [];
    loadedBlogIds.clear();
    pullDownRefreshContainerRef.value?.onRefresh();
  }
};

// 监听路由参数变化
watch(
  () => route.query.refresh,
  (newVal) => {
    if (newVal) {
      // 强制清空当前博文列表，然后触发刷新
      blogList.value = [];
      loadedBlogIds.clear();
      // 重新加载用户公寓信息
      loadUserApartmentInfo();
      pullDownRefreshContainerRef.value?.onRefresh();
    }
  },
  { immediate: true }
);

async function getGroupBlogListHandler(pageInfo: ReqPage) {
  try {
    // 根据当前标签页决定是否添加apartmentId参数
    const params = {
      ...pageInfo,
      apartmentId: tabActive.value === 'apartment' ? userApartmentId.value : -1 
      // 公寓博文传用户公寓ID，公共博文传-1
    };

    // 如果是公寓博文但用户没有公寓，直接返回空列表
    if (tabActive.value === 'apartment' && !hasApartment.value) {
      blogList.value = [];
      pullDownRefreshContainerRef.value?.setFinished(true);
      return;
    }

    const { data } = await getGroupBlogList(params);
    
    if (pageInfo.current === 1) {
      // 第一页数据，完全重置状态，避免任何重复
      blogList.value = [];
      loadedBlogIds.clear();
      
      // 确保没有重复ID的博文被添加（即使后端返回重复数据）
      const uniqueRecords: ExtendedGroupBlogItem[] = [];
      const seenIds = new Set<string | number>();
      
      data.records.forEach(record => {
        const id = Number(record.id);
        if (!seenIds.has(id)) {
          seenIds.add(id);
          uniqueRecords.push(record);
          loadedBlogIds.add(id);
        }
      });
      
      // 加载首页数据的点赞用户信息和关注状态
      await Promise.all([
        loadLikesForBlogs(uniqueRecords),
        loadFollowStatusForBlogs(uniqueRecords)
      ]);
      
      blogList.value = uniqueRecords;
    } else if (data.records.length > 0) {
      // 过滤掉已经加载的博文
      const newRecords = data.records.filter(record => {
        const id = Number(record.id);
        return !loadedBlogIds.has(id);
      });
      
      newRecords.forEach(record => loadedBlogIds.add(Number(record.id)));
      
      // 加载新加载的博文的点赞用户信息和关注状态
      await Promise.all([
        loadLikesForBlogs(newRecords),
        loadFollowStatusForBlogs(newRecords)
      ]);
      
      blogList.value = [...blogList.value, ...newRecords];
    }

    pullDownRefreshContainerRef.value?.setFinished(
      blogList.value.length >= data.total
    );
  } catch (error) {
    console.error('获取博文列表失败:', error);
    showToast('获取数据失败');
  }
}

// 加载博文的点赞用户信息
async function loadLikesForBlogs(blogs: ExtendedGroupBlogItem[]) {
  try {
    // 使用Promise.all并行加载所有博文的点赞用户信息
    await Promise.all(
      blogs.map(async (blog) => {
        const likesRes = await queryBlogLikes(blog.id);
        blog.likeUsers = likesRes.data;
      })
    );
  } catch (error) {
    console.error('加载点赞用户信息失败:', error);
  }
}

// 加载博文的关注状态
async function loadFollowStatusForBlogs(blogs: ExtendedGroupBlogItem[]) {
  try {
    // 过滤出不是当前用户的博文
    const otherUserBlogs = blogs.filter(blog => !isCurrentUserBlog(blog));
    
    // 如果没有其他用户的博文，直接返回
    if (otherUserBlogs.length === 0) return;
    
    // 收集所有不同的作者ID
    const uniqueAuthorIds = Array.from(new Set(otherUserBlogs.map(blog => blog.userId)));
    
    // 创建一个作者ID到关注状态的映射
    const followStatusMap = new Map<number | string, boolean>();
    
    // 使用Promise.all并行查询每个作者的关注状态
    await Promise.all(
      uniqueAuthorIds.map(async (authorId) => {
        try {
          const followRes = await queryFollow(authorId);
          followStatusMap.set(authorId, followRes.data);
        } catch (error) {
          console.error(`获取作者${authorId}的关注状态失败:`, error);
          // 默认未关注
          followStatusMap.set(authorId, false);
        }
      })
    );
    
    // 将关注状态应用到所有相关博文
    otherUserBlogs.forEach(blog => {
      blog.isFollowed = followStatusMap.get(blog.userId) || false;
    });
    
  } catch (error) {
    console.error('加载关注状态信息失败:', error);
  }
}

// 处理发布博文点击事件
const blogPublishHandle = () => {
  // 传递用户公寓信息到发布页面
  router.push({
    path: "/groupBlogPublish",
    query: {
      hasApartment: hasApartment.value ? '1' : '0',
      apartmentId: userApartmentId.value?.toString()
    }
  });
};

// 判断博文是否属于当前登录用户
const isCurrentUserBlog = (blog: ExtendedGroupBlogItem) => {
  const currentUser = userStore.userInfo;
  if (!currentUser) return false;
  
  const blogUserId = String(blog.userId);
  let currentUserId: string | null = null;

  if (currentUser.id != null) 
    currentUserId = String(currentUser.id);

  return blogUserId === currentUserId;
};

// 处理删除博文
const handleDelete = (id: number | string) => {
  showDialog({
    title: '删除提示',
    message: '确定要删除这条博文吗？',
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    showCancelButton: true,
  }).then(async () => {
    try {
      await deleteBlogById(id);
      showToast('删除成功');
      // 删除成功后刷新列表
      pullDownRefreshContainerRef.value?.onRefresh();
    } catch (error) {
      console.error('删除博文失败:', error);
      showToast('删除失败');
    }
  }).catch(() => {
    // 用户取消删除
  });
};

// 处理图片预览
const previewImages = (graphVoList: ExtendedGroupBlogItem['graphVoList'], index: number) => {
  if (!graphVoList || graphVoList.length === 0) {
    showToast('没有可预览的图片');
    return;
  }
  
  try {
    // 提取所有图片URL
    const images = graphVoList.map(item => item.url || '');
    // 过滤掉空URL
    const validImages = images.filter(url => url);
    
    if (validImages.length === 0) {
      showToast('没有可预览的图片');
      return;
    }
    
    // 启动图片预览
    showImagePreview({
      images: validImages,
      startPosition: index,
      closeOnPopstate: true,
      showIndex: true,
      loop: false,
    });
  } catch (error) {
    console.error('图片预览失败:', error);
    showToast('图片加载失败');
  }
};

// 显示评论区域
const showCommentSection = async (blog: ExtendedGroupBlogItem) => {
  // 如果当前博文没有commentContent属性，添加一个
  if (!blog.commentContent) {
    blog.commentContent = '';
  }
  
  // 默认没有显示评论
  if (blog.showComments === undefined) {
    blog.showComments = false;
  }
  
  // 切换评论区显示状态
  blog.showComments = !blog.showComments;
  
  // 如果是显示评论区，则加载评论列表
  if (blog.showComments) {
    try {
      // 加载评论列表
      const commentRes = await queryBlogCommentListById(blog.id);
      // 后端直接返回评论数组
      blog.commentList = commentRes.data;
      
      // 添加调试日志
      // console.log('评论数据详情:', JSON.stringify(blog.commentList));
      
      // 如果评论列表为空，显示提示
      if (!blog.commentList || blog.commentList.length === 0) {
        console.log('该博文暂无评论');
      }
    } catch (error) {
      console.error('加载评论信息失败:', error);
      showToast('加载评论失败');
      blog.commentList = [];
    }
  }
};

// 回复评论
const replyComment = (blog: ExtendedGroupBlogItem, comment: BlogCommentItemInterface) => {
  // 存储被回复的评论，但不修改评论内容
  blog.replyToComment = comment;
  
  // 确保评论内容存在
  if (!blog.commentContent) {
    blog.commentContent = '';
  }
};

// 取消回复
const cancelReply = (blog: ExtendedGroupBlogItem) => {
  blog.replyToComment = undefined;
};

// 提交评论
const submitComment = async (blog: ExtendedGroupBlogItem) => {
  if (!blog.commentContent || !blog.commentContent.trim()) {
    showToast('评论内容不能为空');
    return;
  }
  
  try {
    // 构建评论参数
    const commentParams = {
      blogId: blog.id,
      content: blog.commentContent,
      parentId: blog.replyToComment ? blog.replyToComment.id : null,
      replyUserId: blog.replyToComment ? blog.replyToComment.userId : null
    };
    
    console.log('提交评论参数:', commentParams);
    
    // 调用评论API
    await submitBlogComment(commentParams);
    
    // 清空评论内容和回复状态
    blog.commentContent = '';
    blog.replyToComment = undefined;
    
    // 更新评论数
    blog.comments += 1;
    
    // 刷新评论列表
    try {
      const commentRes = await queryBlogCommentListById(blog.id);
      // 后端直接返回评论数组
      blog.commentList = commentRes.data;
      
      // 添加调试日志
      console.log('提交后评论数据:', JSON.stringify(blog.commentList));
    } catch (error) {
      console.error('刷新评论列表失败:', error);
    }
    
    showToast('评论成功');
  } catch (error) {
    console.error('提交评论失败:', error);
    showToast('评论失败，请稍后再试');
  }
};

// 修改点赞处理函数，点赞后立即刷新点赞用户列表
const likeBlog = async (item: ExtendedGroupBlogItem) => {
  try {
    // 乐观更新UI（先更新UI，再确认服务器响应）
    const originalState = item.isLike;
    const originalLiked = item.liked;
    
    // 更新显示状态
    item.isLike = !item.isLike;
    item.liked += item.isLike ? 1 : -1;
    
    // 调用API
    await likeBlogById(item.id);
    
    // 点赞后立即刷新点赞用户列表
    const likesRes = await queryBlogLikes(item.id);
    item.likeUsers = likesRes.data;
  } catch (error) {
    console.error('点赞失败:', error);
    // 恢复到原来的状态
    item.isLike = !item.isLike;
    item.liked += item.isLike ? 1 : -1;
    showToast('操作失败，请稍后再试');
  }
};

// 添加长按评论相关代码
const touchTimer = ref<number | null>(null);
const touchDuration = 700; // 长按触发时间（毫秒）

// 处理评论触摸开始
const handleCommentTouchStart = (
  event: TouchEvent, 
  blog: ExtendedGroupBlogItem, 
  comment: BlogCommentItemInterface
) => {
  // 清除可能存在的计时器
  if (touchTimer.value !== null) {
    clearTimeout(touchTimer.value);
  }
  
  // 设置新的长按计时器
  touchTimer.value = setTimeout(() => {
    // 检查是否有权限删除评论（博文作者或评论作者）
    // 使用昵称进行比较
    const canDeleteComment = 
      isCurrentUserBlog(blog) || // 是博文作者
      (userStore.userInfo && comment.nickname === userStore.userInfo.nickname); // 或是评论作者
    
    if (canDeleteComment) {
      handleDeleteComment(blog, comment);
    } else {
      showToast('只有博文作者或评论作者可以删除评论');
    }
    
    touchTimer.value = null;
  }, touchDuration) as unknown as number;
};

// 处理评论触摸结束
const handleCommentTouchEnd = () => {
  // 如果计时器还在运行，取消它（说明不是长按）
  if (touchTimer.value !== null) {
    clearTimeout(touchTimer.value);
    touchTimer.value = null;
  }
};

// 处理删除评论
const handleDeleteComment = (blog: ExtendedGroupBlogItem, comment: BlogCommentItemInterface) => {
  showDialog({
    title: '删除提示',
    message: '确定要删除这条评论吗？',
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    showCancelButton: true,
  }).then(async () => {
    try {
      // 删除评论API调用
      await deleteBlogComment(comment.id);
      
      // 更新评论数
      blog.comments -= 1;
      
      // 刷新评论列表
      const commentRes = await queryBlogCommentListById(blog.id);
      blog.commentList = commentRes.data;
      
      showToast('评论已删除');
    } catch (error) {
      console.error('删除评论失败:', error);
      showToast('删除失败');
    }
  }).catch(() => {
    // 用户取消删除
  });
};

// 处理关注博主
const handleFollow = async (blog: ExtendedGroupBlogItem) => {
  try {
    // 确保不是自己关注自己
    if (isCurrentUserBlog(blog)) {
      showToast('不能关注自己');
      return;
    }
    
    // 切换关注状态
    const newFollowState = !blog.isFollowed;
    
    // 乐观更新UI
    blog.isFollowed = newFollowState;
    
    // 调用API
    await followUser(blog.userId, newFollowState);
    
    // 显示操作结果提示
    showToast(newFollowState ? '关注成功' : '已取消关注');
  } catch (error) {
    console.error('关注操作失败:', error);
    
    // 恢复原状态
    blog.isFollowed = !blog.isFollowed;
    
    showToast('操作失败，请稍后再试');
  }
};

</script>

<style lang="less" scoped>
.van-image {
  cursor: pointer;
  transition: opacity 0.2s;
  
  &:active {
    opacity: 0.8;
  }
}

.text-orange {
  color: #FF9800;
}

.van-icon {
  transition: all 0.2s ease;
  
  &[name="good-job"], &[name="good-job-o"] {
    cursor: pointer;
    
    &:active {
      transform: scale(1.2);
    }
  }
}

@keyframes floating {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
}

.animate-float {
  animation: floating 3s ease-in-out infinite;
}

.comment-text {
  padding: 4px 0;
  line-height: 1.5;
  word-break: break-all;
  transition: background-color 0.2s;
  border-radius: 4px;
  
  &:active {
    background-color: rgba(0, 0, 0, 0.05);
  }
}
</style>
