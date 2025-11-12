import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        <ng-container *ngFor="let item of model; let i = index">
            <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
            <li *ngIf="item.separator" class="menu-separator"></li>
        </ng-container>
    </ul> `
})
export class AppMenu {
    model: MenuItem[] = [];

    isSidebarOpen: boolean = true;           // Thêm biến quản lý đóng mở Sidebar

    currentFactory: string = '';             // 🇻🇳 Nhà máy hiện tại đang chọn
    // 🇯🇵 現在選択中の工場
    autoSwitchEnabled: boolean = false;      // 🇻🇳 Trạng thái công tắc tự động chuyển nhà máy
    // 🇯🇵 自動切替機能のオン/オフ状態
    private autoSwitchInterval: any;         // 🇻🇳 Biến lưu ID của interval
    // 🇯🇵 setIntervalのIDを格納する変数
    private factoryList: string[] = ['mercury', 'tierra', 'tierra2', 'jupiter', 'saturn'];
    // 🇻🇳 Danh sách các nhà máy có thể luân chuyển
    // 🇯🇵 自動切替で巡回する工場のリスト

    constructor(private router: Router) { }

    // Hành động đóng mở Sidebar
    toggleSidebar() {
        this.isSidebarOpen = !this.isSidebarOpen;
    }

    // 🇻🇳 Chuyển trang khi click menu
    // 🇯🇵 メニュークリック時に画面遷移
    navigateTo(factory: string): void {
        this.router.navigate([`/${factory}`]);
    }

    // 🇻🇳 Bật/tắt công tắc tự động
    // 🇯🇵 自動切替のオン/オフ操作
    onToggleAutoSwitch(): void {
        this.autoSwitchEnabled = !this.autoSwitchEnabled;
        console.log(this.autoSwitchEnabled);
        localStorage.setItem('autoSwitchEnabled', String(this.autoSwitchEnabled));
        if (this.autoSwitchEnabled) {
            this.startAutoSwitch();
        } else {
            this.stopAutoSwitch();
        }
    }

    // 🇻🇳 Bắt đầu luân chuyển giữa các nhà máy
    // 🇯🇵 工場の自動巡回を開始
    startAutoSwitch(): void {
        let currentIndex = this.factoryList.indexOf(this.currentFactory);
        this.autoSwitchInterval = setInterval(() => {
            currentIndex = (currentIndex + 1) % this.factoryList.length;
            this.router.navigate([this.factoryList[currentIndex]]);
        }, 30000); // 🇻🇳 Mỗi 30 giây | 🇯🇵 30秒ごと
    }

    // 🇻🇳 Dừng tự động luân chuyển
    // 🇯🇵 自動切替を停止する
    stopAutoSwitch(): void {
        if (this.autoSwitchInterval) {
            clearInterval(this.autoSwitchInterval);
        }
    }

    private buildMenu() {
        this.model = [
            {
                label: 'Home',
                items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/'] }]
            },
            {
                label: '🗺️ Factory Layouts',
                items: [
                    { label: '🪐 Mercury', routerLink: ['/mercury'] },
                    { label: '🌎 Tierra', routerLink: ['/tierra'] },
                    { label: '🌎 Tierra-2', routerLink: ['/tierra2'] },
                    { label: '🪐 Jupiter', routerLink: ['/jupiter'] },
                    { label: '🪐 Saturn', routerLink: ['/saturn'] },
                    { label: `🔄 Auto Switch`, isAutoSwitch: true, autoSwitchEnabled: this.autoSwitchEnabled, command: () => { this.onToggleAutoSwitch();  this.buildMenu(); } }
                ]
            },
            {
                label: 'UI Components',
                items: [
                    { label: 'Form Layout', icon: 'pi pi-fw pi-id-card', routerLink: ['/uikit/formlayout'] },
                    { label: 'Input', icon: 'pi pi-fw pi-check-square', routerLink: ['/uikit/input'] },
                    { label: 'Button', icon: 'pi pi-fw pi-mobile', class: 'rotated-icon', routerLink: ['/uikit/button'] },
                    { label: 'Table', icon: 'pi pi-fw pi-table', routerLink: ['/uikit/table'] },
                    { label: 'List', icon: 'pi pi-fw pi-list', routerLink: ['/uikit/list'] },
                    { label: 'Tree', icon: 'pi pi-fw pi-share-alt', routerLink: ['/uikit/tree'] },
                    { label: 'Panel', icon: 'pi pi-fw pi-tablet', routerLink: ['/uikit/panel'] },
                    { label: 'Overlay', icon: 'pi pi-fw pi-clone', routerLink: ['/uikit/overlay'] },
                    { label: 'Media', icon: 'pi pi-fw pi-image', routerLink: ['/uikit/media'] },
                    { label: 'Menu', icon: 'pi pi-fw pi-bars', routerLink: ['/uikit/menu'] },
                    { label: 'Message', icon: 'pi pi-fw pi-comment', routerLink: ['/uikit/message'] },
                    { label: 'File', icon: 'pi pi-fw pi-file', routerLink: ['/uikit/file'] },
                    { label: 'Chart', icon: 'pi pi-fw pi-chart-bar', routerLink: ['/uikit/charts'] },
                    { label: 'Timeline', icon: 'pi pi-fw pi-calendar', routerLink: ['/uikit/timeline'] },
                    { label: 'Misc', icon: 'pi pi-fw pi-circle', routerLink: ['/uikit/misc'] }
                ]
            },
            {
                label: 'Pages',
                icon: 'pi pi-fw pi-briefcase',
                routerLink: ['/pages'],
                items: [
                    {
                        label: 'Landing',
                        icon: 'pi pi-fw pi-globe',
                        routerLink: ['/landing']
                    },
                    {
                        label: 'Auth',
                        icon: 'pi pi-fw pi-user',
                        items: [
                            {
                                label: 'Login',
                                icon: 'pi pi-fw pi-sign-in',
                                routerLink: ['/auth/login']
                            },
                            {
                                label: 'Error',
                                icon: 'pi pi-fw pi-times-circle',
                                routerLink: ['/auth/error']
                            },
                            {
                                label: 'Access Denied',
                                icon: 'pi pi-fw pi-lock',
                                routerLink: ['/auth/access']
                            }
                        ]
                    },
                    {
                        label: 'Crud',
                        icon: 'pi pi-fw pi-pencil',
                        routerLink: ['/pages/crud']
                    },
                    {
                        label: 'Not Found',
                        icon: 'pi pi-fw pi-exclamation-circle',
                        routerLink: ['/pages/notfound']
                    },
                    {
                        label: 'Empty',
                        icon: 'pi pi-fw pi-circle-off',
                        routerLink: ['/pages/empty']
                    }
                ]
            },
            {
                label: 'Hierarchy',
                items: [
                    {
                        label: 'Submenu 1',
                        icon: 'pi pi-fw pi-bookmark',
                        items: [
                            {
                                label: 'Submenu 1.1',
                                icon: 'pi pi-fw pi-bookmark',
                                items: [
                                    { label: 'Submenu 1.1.1', icon: 'pi pi-fw pi-bookmark' },
                                    { label: 'Submenu 1.1.2', icon: 'pi pi-fw pi-bookmark' },
                                    { label: 'Submenu 1.1.3', icon: 'pi pi-fw pi-bookmark' }
                                ]
                            },
                            {
                                label: 'Submenu 1.2',
                                icon: 'pi pi-fw pi-bookmark',
                                items: [{ label: 'Submenu 1.2.1', icon: 'pi pi-fw pi-bookmark' }]
                            }
                        ]
                    },
                    {
                        label: 'Submenu 2',
                        icon: 'pi pi-fw pi-bookmark',
                        items: [
                            {
                                label: 'Submenu 2.1',
                                icon: 'pi pi-fw pi-bookmark',
                                items: [
                                    { label: 'Submenu 2.1.1', icon: 'pi pi-fw pi-bookmark' },
                                    { label: 'Submenu 2.1.2', icon: 'pi pi-fw pi-bookmark' }
                                ]
                            },
                            {
                                label: 'Submenu 2.2',
                                icon: 'pi pi-fw pi-bookmark',
                                items: [{ label: 'Submenu 2.2.1', icon: 'pi pi-fw pi-bookmark' }]
                            }
                        ]
                    }
                ]
            },
            {
                label: 'Get Started',
                items: [
                    {
                        label: 'Documentation',
                        icon: 'pi pi-fw pi-book',
                        routerLink: ['/documentation']
                    },
                    {
                        label: 'View Source',
                        icon: 'pi pi-fw pi-github',
                        url: 'https://github.com/primefaces/sakai-ng',
                        target: '_blank'
                    }
                ]
            },
            // test
            {
                label: 'sample',
                items: [
                    { label: 'test',
                      icon: 'pi pi-fw pi-home',
                      routerLink: ['/test']
                    },
                    { label: 'test2',
                      icon: 'pi pi-fw pi-home',
                      routerLink: ['/test2']
                    }
                ]
            },
            //
        ];
    }


    ngOnInit() {
        // 🇻🇳 Gán route hiện tại để highlight menu
        // 🇯🇵 現在のルートを取得してメニューにハイライトを設定
        this.router.events.subscribe(event => {
            if (event instanceof NavigationEnd) {
                const segments = event.urlAfterRedirects.split('/');
                this.currentFactory = segments[1];
            }
        });

        // 🇻🇳 Đọc trạng thái công tắc từ localStorage
        // 🇯🇵 localStorageから自動切替の状態を読み込む
        const savedState = localStorage.getItem('autoSwitchEnabled');
        if (savedState === 'true') {
            this.autoSwitchEnabled = true;
            this.startAutoSwitch();
        }
        this.buildMenu();
    }
}
