import { Component } from '@angular/core';

@Component({
  selector: 'app-forbidden-screen',
  standalone: true,
  template: `
    <div class="forbidden-container" style="text-align: center; padding: 50px;">
      <h2>403 Forbidden</h2>
      <p>You do not have permission to access this page.</p>
    </div>
  `
})
export class ForbiddenScreen {}
