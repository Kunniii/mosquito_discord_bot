# Sử dụng Node.js v24 alpine (nhẹ và bảo mật) hoặc bookworm-slim (đầy đủ build-essential cho audio packages)
FROM node:24-bookworm-slim AS base

WORKDIR /app

# Cài đặt các thư viện hệ thống cần thiết cho ffmpeg và audio encoding nếu cần
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Cài đặt dependencies (bao gồm devDependencies cho typecheck)
RUN npm ci

# Copy toàn bộ mã nguồn
COPY . .

# Kiểm tra typecheck trước khi build hoàn tất
RUN npm run typecheck

# Dọn dẹp devDependencies để giảm kích thước image
RUN npm prune --omit=dev

# Tạo thư mục chứa SQLite database và phân quyền cho user node
RUN mkdir -p /app/data && chown -R node:node /app/data

# Chạy bot dưới user node bảo mật
USER node

# Biến môi trường production
ENV NODE_ENV=production

# Khởi động bot (tự động deploy command và chạy server)
CMD ["npm", "start"]
