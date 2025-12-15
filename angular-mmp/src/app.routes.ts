import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { Dashboard } from './app/pages/dashboard/dashboard';
import { Documentation } from './app/pages/documentation/documentation';
import { Landing } from './app/pages/landing/landing';
import { Notfound } from './app/pages/notfound/notfound';
import { MercuryComponent } from './app/mercury/mercury.component';
import { TierraComponent } from './app/tierra/tierra.component';
import { Tierra2Component } from './app/tierra2/tierra2.component';
import { JupiterComponent } from './app/jupiter/jupiter.component';
import { SaturnComponent } from './app/saturn/saturn.component';
import { AuthGuard } from './app/guards/auth.guard';
import { NonAuthGuard } from './app/guards/non-auth.guard';
import { GeneralInformation } from './app/pages/account-management/generalInformation';
import { AccountManagement } from './app/pages/account-management/accountManagement';
// import { Test } from './app/test/test.component';
// import { Test2 } from './app/test2/test2.component';
import { PlanComponent } from './app/plan/plan.component';

export const appRoutes: Routes = [
    {
        canActivate: [AuthGuard],
        path: '',
        component: AppLayout,
        children: [
            { path: '', component: Dashboard },
            { path: 'uikit', loadChildren: () => import('./app/pages/uikit/uikit.routes') },
            { path: 'documentation', component: Documentation },
            { path: 'pages', loadChildren: () => import('./app/pages/pages.routes') },
            // 🇻🇳 Khi truy cập đường dẫn gốc (""), tự động chuyển hướng sang trang "mercury".
            // 🇯🇵 空のパス（""）にアクセスすると、自動的に "mercury" ページへリダイレクトします。
            { path: 'mercury', component: MercuryComponent },
            { path: 'tierra', component: TierraComponent },
            { path: 'tierra2', component: Tierra2Component },
            { path: 'jupiter', component: JupiterComponent },
            { path: 'saturn', component: SaturnComponent },
            // 🇻🇳 Các route tương ứng với từng nhà máy (component).
            // 🇯🇵 それぞれの工場ページに対応するルート定義です。
            { path: 'general-information', component: GeneralInformation },
            { path: 'account-management', component: AccountManagement },
            { path: 'plan', component: PlanComponent},
            // { path: 'test', component: Test},
            // { path: 'test2', component: Test2},

        ]
    },
    { path: 'landing', component: Landing },
    { path: 'notfound', component: Notfound },
    { 
        canActivate: [NonAuthGuard],
        path: 'auth', loadChildren: () => import('./app/pages/auth/auth.routes')
    },

    { path: '**', redirectTo: '/notfound' }
];
