import { mountApp } from '@cobblestone/app';
import '@cobblestone/app/styles.css';
import { desktopPlatform } from './platform';

mountApp(document.getElementById('root')!, desktopPlatform);
