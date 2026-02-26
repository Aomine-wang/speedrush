# SpeedRush Backend

极速赛车合约游戏后端服务

## 功能特性

- ✅ 钱包登录（MetaMask/WalletConnect）
- ✅ 10,000 USDT 体验金发放
- ✅ 10000x 杠杆交易
- ✅ 30秒自动结算
- ✅ 实时价格推送（WebSocket）
- ✅ 排行榜系统

## 技术栈

- Node.js + Express
- WebSocket（实时数据）
- Ethers.js（钱包验证）
- JWT（身份认证）

## API 接口

### 认证
- `POST /api/auth/nonce` - 获取登录 nonce
- `POST /api/auth/login` - 钱包签名登录
- `GET /api/auth/profile` - 获取用户信息

### 交易
- `POST /api/trade/order` - 下单（做多/做空）
- `GET /api/trade/history` - 交易历史

### 排行榜
- `GET /api/leaderboard` - 获取排行榜
- `GET /api/leaderboard/me` - 我的排名

### 健康检查
- `GET /health` - 服务状态

## 部署到 Railway

1. Fork 此仓库到你的 GitHub
2. 在 Railway 创建新项目
3. 选择 "Deploy from GitHub repo"
4. 选择 fork 的仓库
5. 自动部署完成

## 环境变量

```
PORT=3000
JWT_SECRET=your-secret-key
```

## 前端连接

前端部署在 Vercel，通过环境变量连接后端：
```
NEXT_PUBLIC_API_URL=https://your-railway-app.up.railway.app
NEXT_PUBLIC_WS_URL=wss://your-railway-app.up.railway.app
```
