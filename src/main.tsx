import React from 'react';
import ReactDOM from 'react-dom/client';
import {ConfigProvider,App as AntApp} from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App.tsx';
import 'antd/dist/reset.css';
import './styles.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ConfigProvider locale={zhCN} theme={{token:{colorPrimary:'#1677ff',colorSuccess:'#16a085',colorError:'#e65054',colorText:'#26344b',colorTextSecondary:'#8893a5',colorBorder:'#e5e9f0',borderRadius:6,fontSize:13,fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif',controlHeight:33},components:{Table:{headerBg:'#f8fafc',headerColor:'#8b94a4',rowHoverBg:'#f5f9ff',cellPaddingBlockSM:13},Button:{defaultShadow:'none',primaryShadow:'none'},Menu:{itemHeight:43,itemBorderRadius:5,itemSelectedBg:'#edf4ff'},Modal:{borderRadiusLG:10}}}}><AntApp><App/></AntApp></ConfigProvider></React.StrictMode>);
