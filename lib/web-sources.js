const references = [
  {
    kind: 'image', source: 'Thông Tin Đối Ngoại',
    title: 'Bộ đội kéo pháo vào trận địa Điện Biên Phủ',
    credit: 'Ảnh tư liệu TTXVN',
    url: 'https://ttdn.vn/nghien-cuu-trao-doi/su-kien-binh-luan/nghe-thuat-to-chuc-su-dung-phao-binh-trong-chien-dich-dien-bien-phu-104212',
    thumb: 'https://ttdn.vn/Uploads/Images/2024/5/6/5/7239-8.12.jpg'
  },
  {
    kind: 'image', source: 'Báo Thái Nguyên',
    title: 'Kéo pháo vào – ra trong Chiến dịch Điện Biên Phủ',
    url: 'https://baothainguyen.vn/chinh-tri/202404/keo-phao-vao-ra-trong-chien-dich-dien-bien-phu-1d216d3/',
    thumb: 'https://baothainguyen.vn/file/e7837c027f6ecd14017ffa4e5f2a0e34/042024/bk.1499_resize-1417x1028_20240414153526_20240415103304.jpg'
  },
  {
    kind: 'image', source: 'Nhân Dân',
    title: 'Ảnh tư liệu bộ đội kéo pháo ra mặt trận Điện Biên Phủ',
    url: 'https://nhandan.vn/tu-doc-bay-toi-toi-doc-ong-mau-va-nhung-chien-si-chan-dong-vai-sat-post357731.html'
  },
  {
    kind: 'video', source: 'VTV24',
    title: 'Kéo pháo vào trận địa – Công tác hậu cần tại Điện Biên Phủ',
    url: 'https://www.youtube.com/watch?v=88OE14Bxn-I',
    youtube: '88OE14Bxn-I',
    description: 'Phóng sự về hậu cần chiến dịch, có nội dung bộ đội dùng sức người kéo pháo vượt đèo.'
  },
  {
    kind: 'video', source: 'QPVN',
    title: 'Điện Biên Phủ 1954 – 56 ngày đêm',
    url: 'https://www.youtube.com/watch?v=qvE5Zd9kHPY',
    youtube: 'qvE5Zd9kHPY',
    description: 'Phim tài liệu toàn chiến dịch có phần về kéo pháo bằng sức người.'
  },
  {
    kind: 'video', source: 'VTV24',
    title: 'Tháo pháo – Kỳ tích kéo pháo vào, kéo pháo ra',
    url: 'https://www.youtube.com/watch?v=hEQ2BUxVubc',
    youtube: 'hEQ2BUxVubc',
    description: 'Phóng sự về tháo và vận chuyển pháo trong chiến dịch Điện Biên Phủ.'
  }
];

export function editorialReferences(artillery, kinds) {
  return artillery ? references.filter(item => kinds.includes(item.kind)).map(item => ({
    ...item, id: item.url, editorial: true, thumb: item.thumb || (item.youtube ? 'https://i.ytimg.com/vi/' + item.youtube + '/hqdefault.jpg' : ''),
    rights: 'Tham khảo · Kiểm tra quyền sử dụng'
  })) : [];
}

export async function braveMedia(json, query, kind, count) {
  const params = new URLSearchParams({ q: query, count: String(count) });
  if (/[À-ỹ]/u.test(query)) params.set('search_lang', 'vi');
  const data = await json('https://api.search.brave.com/res/v1/' + kind + 's/search?' + params, {
    headers: { Accept: 'application/json', 'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY }
  });
  return (data.results || []).flatMap(row => {
    if (!row.url || !row.title) return [];
    const youtube = row.url.match(/^https:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})(?:[&#]|$)/)?.[1];
    return [{
      id: row.url + (kind === 'image' ? ':' + (row.properties?.url || row.thumbnail?.src || row.title) : ''),
      source: row.meta_url?.hostname || row.source || 'Web', kind,
      title: row.title.replace(/<[^>]+>/g, ''),
      description: String(row.description || '').replace(/<[^>]+>/g, ''),
      url: row.url, thumb: row.thumbnail?.src, youtube,
      rights: 'Tham khảo · Kiểm tra quyền sử dụng'
    }];
  });
}
