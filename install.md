# English Corner Ubuntu 服务器安装指南

## 🎯 适合人群
本指南专为**零基础小白用户**设计，即使你从未使用过Linux服务器，也能按照步骤完成部署。

## 📋 部署前准备

### 1. 服务器要求
- **操作系统**: Ubuntu 20.04/22.04 LTS
- **CPU**: 至少2核
- **内存**: 至少2GB (推荐4GB)
- **硬盘**: 至少20GB可用空间
- **网络**: 公网IP地址

### 2. 域名准备（可选但推荐）
- 购买一个域名（如：example.com）
- 将域名解析到你的服务器IP

### 3. 连接服务器
使用SSH工具连接你的服务器：

**Windows用户**: 使用 [PuTTY](https://www.putty.org/) 或 [MobaXterm](https://mobaxterm.mobatek.net/)
**Mac/Linux用户**: 使用终端 Terminal

连接命令：
```bash
ssh root@你的服务器IP
# 输入密码后登录
```

---

## 🚀 第一步：系统环境配置

### 1.1 更新系统
```bash
# 更新软件包列表
sudo apt update

# 升级已安装的软件包
sudo apt upgrade -y

# 安装常用工具
sudo apt install -y curl wget git vim
```

### 1.2 安装 Node.js 18
```bash
# 下载Node.js安装脚本
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# 安装Node.js
sudo apt-get install -y nodejs

# 验证安装
node --version  # 应该显示 v18.x.x
npm --version   # 应该显示 8.x.x 或更高
```

### 1.3 安装 PostgreSQL 数据库
```bash
# 安装PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# 启动PostgreSQL服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 检查服务状态
sudo systemctl status postgresql
```

### 1.4 安装 Nginx Web服务器
```bash
# 安装Nginx
sudo apt install -y nginx

# 启动Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 检查Nginx状态
sudo systemctl status nginx
```

### 1.5 安装 PM2 进程管理器
```bash
# 全局安装PM2
sudo npm install -g pm2

# 验证安装
pm2 --version
```

---

## 🗄️ 第二步：数据库配置

### 2.1 创建数据库和用户
```bash
# 切换到postgres用户
sudo -u postgres psql

# 在PostgreSQL命令行中执行：
CREATE DATABASE english_corner;
CREATE USER english_user WITH ENCRYPTED PASSWORD '你的密码';
GRANT ALL PRIVILEGES ON DATABASE english_corner TO english_user;

# 退出PostgreSQL
\q
```

💡 **密码建议**: 使用强密码，包含大小写字母、数字和特殊符号

### 2.2 测试数据库连接
```bash
# 测试连接
psql -h localhost -U english_user -d english_corner
# 输入密码后应该能看到PostgreSQL提示符
```

---

## 📦 第三步：应用部署

### 3.1 获取项目代码
```bash
# 创建应用目录
sudo mkdir -p /opt/apps
sudo chown $USER:$USER /opt/apps
cd /opt/apps

# 克隆项目（替换为你的仓库地址）
git clone https://github.com/你的用户名/english-corner.git
cd english-corner
```

### 3.2 安装依赖
```bash
# 安装项目依赖
npm install

# 如果安装慢，可以使用淘宝镜像
npm install --registry=https://registry.npmmirror.com
```

### 3.3 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑环境变量文件
nano .env.local
```

在 `.env.local` 文件中填写以下内容：
```bash
# 数据库配置（使用你设置的密码）
DATABASE_URL="postgresql://english_user:你的密码@localhost:5432/english_corner"

# 认证配置（替换为你的域名）
NEXTAUTH_URL="https://你的域名.com"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# AI服务配置（选择一种）
# 使用Kimi AI（需要API密钥）
KIMI_API_KEY="你的kimi-api密钥"

# 或者使用Ollama本地模型（免费）
# OLLAMA_BASE_URL="http://localhost:11434"

# 通用配置
KIMI_API_TIMEOUT=30000
MAX_RETRIES=3
RETRY_DELAY=1000

# 生产环境配置
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
```

💡 **生成密钥**: 在终端运行 `openssl rand -base64 32` 生成NEXTAUTH_SECRET

### 3.4 构建应用
```bash
# 生成Prisma客户端
npx prisma generate

# 运行数据库迁移
npx prisma db push

# 构建生产版本
npm run build
```

### 3.5 使用PM2启动应用
```bash
# 启动应用
pm2 start npm --name "english-corner" -- start

# 设置开机自启
pm2 startup
pm2 save

# 查看应用状态
pm2 status
```

---

## 🌐 第四步：Web服务器配置

### 4.1 配置Nginx反向代理
```bash
# 创建Nginx配置文件
sudo nano /etc/nginx/sites-available/english-corner
```

粘贴以下内容（替换你的域名）：
```nginx
server {
    listen 80;
    server_name 你的域名.com www.你的域名.com;
    
    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name 你的域名.com www.你的域名.com;

    # SSL证书路径（下一步会生成）
    ssl_certificate /etc/letsencrypt/live/你的域名.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/你的域名.com/privkey.pem;

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 反向代理配置
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态文件缓存
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 302 1h;
        proxy_cache_valid 404 1m;
    }
}
```

### 4.2 启用Nginx配置
```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/english-corner /etc/nginx/sites-enabled/

# 删除默认配置
sudo rm /etc/nginx/sites-enabled/default

# 测试Nginx配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

### 4.3 配置SSL证书（免费）
```bash
# 安装Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取SSL证书（替换你的域名和邮箱）
sudo certbot --nginx -d 你的域名.com -d www.你的域名.com --email 你的邮箱@example.com --agree-tos --non-interactive

# 设置自动续期
sudo crontab -e
# 添加以下行（每天中午12点检查续期）
0 12 * * * /usr/bin/certbot renew --quiet
```

---

## ✅ 第五步：验证部署

### 5.1 检查服务状态
```bash
# 检查所有服务状态
sudo systemctl status nginx
sudo systemctl status postgresql
pm2 status
```

### 5.2 测试网站访问
在浏览器中访问：`https://你的域名.com`

应该能看到English Corner的登录页面。

### 5.3 创建测试用户
```bash
# 访问注册页面
https://你的域名.com/register

# 创建第一个用户账号
```

### 5.4 健康检查
```bash
# 测试API健康状态
curl https://你的域名.com/api/health

# 应该返回 {"status":"ok"}
```

---

## 🦙 可选：安装Ollama本地AI（免费）

如果你不想使用付费的AI服务，可以安装本地AI模型：

### 安装Ollama
```bash
# 下载安装脚本
curl -fsSL https://ollama.ai/install.sh | sh

# 启动Ollama服务
sudo systemctl enable ollama
sudo systemctl start ollama

# 下载模型（选择其中一个）
ollama pull llama2      # 较小模型，2-4GB内存
ollama pull mistral     # 中等模型，4-8GB内存
ollama pull codellama   # 代码模型，适合学习

# 测试Ollama
curl http://localhost:11434/api/tags
```

### 更新环境变量
编辑 `.env.local` 文件：
```bash
# 注释掉Kimi配置
# KIMI_API_KEY="你的kimi-api密钥"

# 启用Ollama
OLLAMA_BASE_URL="http://localhost:11434"
```

重启应用：
```bash
pm2 restart english-corner
```

---

## 🔧 常见问题解决

### 1. 端口被占用
```bash
# 查看端口占用
sudo lsof -i :3000

# 杀死进程
sudo kill -9 进程ID
```

### 2. 数据库连接失败
```bash
# 检查PostgreSQL服务
sudo systemctl status postgresql

# 检查数据库连接
psql -h localhost -U english_user -d english_corner
```

### 3. Nginx配置错误
```bash
# 测试配置
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log
```

### 4. 应用启动失败
```bash
# 查看应用日志
pm2 logs english-corner

# 重新安装依赖
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 5. SSL证书问题
```bash
# 手动续期证书
sudo certbot renew

# 检查证书状态
sudo certbot certificates
```

---

## 📊 维护命令

### 日常维护
```bash
# 查看应用状态
pm2 status

# 查看实时日志
pm2 logs english-corner

# 重启应用
pm2 restart english-corner

# 更新代码（如果有新版本）
git pull
npm install
npm run build
pm2 restart english-corner
```

### 备份数据库
```bash
# 创建备份脚本
nano /opt/backup.sh
```

粘贴以下内容：
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
DB_NAME="english_corner"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
pg_dump -U english_user -d $DB_NAME > "$BACKUP_DIR/english_corner_$DATE.sql"

# 压缩备份
gzip "$BACKUP_DIR/english_corner_$DATE.sql"

# 删除7天前的备份
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "备份完成: $BACKUP_DIR/english_corner_$DATE.sql.gz"
```

设置定时备份：
```bash
# 给脚本执行权限
chmod +x /opt/backup.sh

# 每天凌晨2点自动备份
sudo crontab -e
# 添加：0 2 * * * /opt/backup.sh
```

---

## 🎉 恭喜！部署完成

你的English Corner应用现在已经成功部署！你可以：

1. **访问网站**: https://你的域名.com
2. **注册账号**: 创建第一个用户
3. **开始使用**: 体验AI英语对话
4. **邀请朋友**: 使用邀请功能

### 后续维护
- 定期检查 `pm2 status` 查看应用状态
- 关注服务器资源使用情况（内存、CPU）
- 定期备份数据库
- 关注项目更新，及时升级

### 获取帮助
如果遇到问题，可以：
1. 查看PM2日志: `pm2 logs english-corner`
2. 检查Nginx错误日志: `sudo tail -f /var/log/nginx/error.log`
3. 查看数据库日志: `sudo tail -f /var/log/postgresql/postgresql-*.log`

---

**文档版本**: v1.0  
**最后更新**: 2025年8月25日  
**适用版本**: English Corner v2.0+

💡 **提示**: 本指南尽可能详细，如果仍有问题，建议寻求有经验的朋友帮助或在技术社区提问。