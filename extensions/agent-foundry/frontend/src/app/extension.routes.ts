import { Routes } from '@angular/router';
import { ListRunComponent } from './list/list-run.component';
import { AddRunComponent } from './add/add-run.component';
import { ViewRunComponent } from './view/view-run.component';

// What the host lazy-loads (manifest frontend.remote.exposedModule = './Extension').
// THE EXPORTED CONST MUST BE NAMED `Extension`.
export const Extension: Routes = [
  { path: '', component: ListRunComponent },
  { path: 'add', component: AddRunComponent },
  { path: 'edit/:id', component: AddRunComponent, data: { action: 'Edit' } },
  { path: 'view/:id', component: ViewRunComponent },
];
