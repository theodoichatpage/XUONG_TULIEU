export function isPipeline(query) {
  return /\b(?:xang dau|ong dan xang|fuel pipeline|x42)\b/.test(query)
    && /\b(?:duong|tuyen|truong son|559|thoi chien|pipeline|x42)\b/.test(query);
}

export const pipelineQueries = [
  'đường ống xăng dầu Trường Sơn',
  'tuyến ống xăng dầu Đoàn 559',
  'tuyến X42 đường ống xăng dầu',
  'Truong Son fuel pipeline'
];

const images = [
  ['Báo Quân đội nhân dân', 'Tuyến đường ống xăng dầu huyền thoại',
    'https://www.qdnd.vn/quoc-phong-an-ninh/nghe-thuat-quan-su-vn/bai-3-tuyen-duong-ong-xang-dau-huyen-thoai-720475',
    'https://file3.qdnd.vn/data/images/0/2023/03/02/tuanson/20.png?dpi=150&quality=100&w=870'],
  ['VTV', 'Tuyến đường xăng dầu Trường Sơn',
    'https://vtv.vn/xa-hoi/huyen-thoai-tuyen-duong-xang-dau-truong-son-20200724135836881.htm',
    'https://cdn-images.vtv.vn/2020/7/24/doanxe1-1595574620592922468149.jpg'],
  ['Dân Việt', 'Ảnh trưng bày về đường ống xăng dầu Trường Sơn',
    'https://danviet.vn/cong-bo-100-buc-anh-biet-noi-ve-suc-song-manh-liet-cua-duong-truong-son-huyen-thoai-20240419085438191-d1156988.html',
    'https://danviet.ex-cdn.com/files/f1/296231569849192448/2024/4/19/duong-truong-son-15-17134909788521944244050.jpg'],
  ['Thương mại 360', 'Sơ đồ đường ống xăng dầu Trường Sơn kèm ảnh minh họa',
    'https://thuongmai360.vn/nangluong-cuocsong/duong-ong-xang-dau-huyen-thoai-truong-son.html',
    'https://pvn.vn/DataStore/Images/2022/09/17/ong%20TS%201.jpg']
];

export const pipelineImages = images.map(([source, title, url, thumb]) => ({
  id: url, source, title, url, thumb, kind: 'image', editorial: true,
  rights: 'Tham khảo · Kiểm tra quyền sử dụng'
}));
