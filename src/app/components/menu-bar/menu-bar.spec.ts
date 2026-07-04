import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MenuBar } from './menu-bar';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';

describe('MenuBar', () => {
  let component: MenuBar;
  let fixture: ComponentFixture<MenuBar>;
  let mockCommonService: any;
  let mockAlertService: any;
  let mockPermissionService: any;

  const mockMenusData = [
    { id: 1, name: 'Dashboard', path: '/dashboard', icon: 'grid', isActive: true },
    { id: 2, name: 'Products', path: '/products', icon: 'box', isActive: false }
  ];

  beforeEach(async () => {
    mockCommonService = {
      getApi: jasmine.createSpy('getApi').and.returnValue(of({ data: mockMenusData })),
      postApi: jasmine.createSpy('postApi').and.returnValue(of({ success: true })),
      putApi: jasmine.createSpy('putApi').and.returnValue(of({ success: true })),
      deleteApi: jasmine.createSpy('deleteApi').and.returnValue(of({ success: true }))
    };

    mockAlertService = {
      confirm: jasmine.createSpy('confirm').and.returnValue(Promise.resolve({ isConfirmed: true })),
      success: jasmine.createSpy('success'),
      error: jasmine.createSpy('error')
    };

    mockPermissionService = {
      hasRoleAction: jasmine.createSpy('hasRoleAction').and.returnValue(true)
    };

    await TestBed.configureTestingModule({
      imports: [MenuBar, ReactiveFormsModule, NoopAnimationsModule],
      providers: [
        { provide: CommonService, useValue: mockCommonService },
        { provide: AlertService, useValue: mockAlertService },
        { provide: PermissionService, useValue: mockPermissionService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MenuBar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load menus on initialization', () => {
    expect(mockCommonService.getApi).toHaveBeenCalledWith('menus');
    expect(component.menus.length).toBe(2);
    expect(component.menus[0].status).toBe('Active');
    expect(component.menus[1].status).toBe('Inactive');
  });

  it('should switch to add mode on AddNewMenu()', () => {
    component.AddNewMenu();
    expect(component.Menu_Forms).toBeTrue();
    expect(component.View_Mode).toBeFalse();
    expect(component.Update_button).toBeFalse();
    expect(component.MenuForm.value.isActive).toBeTrue();
  });

  it('should switch to view mode on viewMenu()', () => {
    const testMenu = mockMenusData[0];
    component.viewMenu(testMenu);
    expect(component.SelectedMenu).toEqual(testMenu);
    expect(component.View_Mode).toBeTrue();
    expect(component.Menu_Forms).toBeFalse();
  });

  it('should switch to edit mode on editMenu()', () => {
    const testMenu = mockMenusData[0];
    component.editMenu(testMenu);
    expect(component.SelectedMenuId).toBe(1);
    expect(component.Menu_Forms).toBeTrue();
    expect(component.Update_button).toBeTrue();
    expect(component.MenuForm.value.name).toBe('Dashboard');
  });

  it('should call postApi when submitting a new menu', () => {
    component.AddNewMenu();
    component.MenuForm.patchValue({
      name: 'New Menu',
      path: '/new-path',
      icon: 'star',
      isActive: true
    });
    component.submit(component.MenuForm);
    expect(mockCommonService.postApi).toHaveBeenCalledWith('menus', {
      name: 'New Menu',
      path: '/new-path',
      icon: 'star',
      isActive: true
    });
    expect(mockAlertService.success).toHaveBeenCalledWith('Menu created successfully');
  });

  it('should call putApi when updating an existing menu', () => {
    const testMenu = mockMenusData[0];
    component.editMenu(testMenu);
    component.MenuForm.patchValue({
      name: 'Updated Dashboard'
    });
    component.submit(component.MenuForm);
    expect(mockCommonService.putApi).toHaveBeenCalledWith('menus/update/1', {
      name: 'Updated Dashboard',
      path: '/dashboard',
      icon: 'grid',
      isActive: true
    });
    expect(mockAlertService.success).toHaveBeenCalledWith('Menu updated successfully');
  });

  it('should call deleteApi on deleteMenu() when confirmed', async () => {
    const testMenu = mockMenusData[0];
    await component.deleteMenu(testMenu);
    expect(mockAlertService.confirm).toHaveBeenCalled();
    expect(mockCommonService.deleteApi).toHaveBeenCalledWith('menus/delete/1');
    expect(mockAlertService.success).toHaveBeenCalledWith('Menu deleted successfully');
  });

  it('should not seed routes if all are already present', () => {
    component.menus = component.defaultRoutes.map((dr, idx) => ({
      id: idx + 1,
      name: dr.name,
      path: dr.path,
      icon: dr.icon,
      isActive: dr.isActive,
      status: 'Active'
    }));

    component.seedDefaultRoutes();
    expect(mockAlertService.success).toHaveBeenCalledWith('All default routes are already added');
    expect(mockAlertService.confirm).not.toHaveBeenCalled();
  });

  it('should seed missing routes when confirmed', async () => {
    mockAlertService.confirm.calls.reset();
    mockCommonService.postApi.calls.reset();

    await component.seedDefaultRoutes();

    expect(mockAlertService.confirm).toHaveBeenCalled();
    expect(mockCommonService.postApi).toHaveBeenCalledTimes(13);
    expect(mockAlertService.success).toHaveBeenCalledWith('Default routes added successfully');
  });
});
