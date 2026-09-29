import { mountApp } from '@cobblestone/app';
import '@cobblestone/app/styles.css';
import { webPlatform } from './platform';

mountApp(document.getElementById('root')!, webPlatform);
