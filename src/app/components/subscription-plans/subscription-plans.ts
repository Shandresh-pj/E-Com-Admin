import { Component, OnInit, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { SubscriptionService, SubscriptionPlan } from '../../services/subscription.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { MatTable } from 'src/utils/mat-table/mat-table';

@Component({
  selector: 'app-subscription-plans',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatBadgeModule,
    MatDividerModule,
    MatTable
  ],
  templateUrl: './subscription-plans.html',
  styleUrls: ['./subscription-plans.scss'],
  encapsulation: ViewEncapsulation.None
})
export class SubscriptionPlansComponent implements OnInit {

  // ── Table State ──────────────────────────────────────────────────────────
  plans: any[] = [];
  isLoading = false;

  tableColumns = [
    { columnDef: 'name',            header: 'Plan Name'    },
    { columnDef: 'badge',           header: 'Tier Badge'   },
    { columnDef: '_monthlyPriceStr', header: 'Monthly'     },
    { columnDef: '_yearlyPriceStr',  header: 'Yearly'      },
    { columnDef: '_freeTrialStr',    header: 'Free Trial'  },
    { columnDef: '_recommendedStr',  header: 'Status'      }
  ];

  // ── Form State ─────────────────────────────────────────────────────────
  Subscription_Form = false;
  editingPlan: SubscriptionPlan | null = null;
  planForm: FormGroup;
  activeFormTab: 'basic' | 'pricing' | 'features' = 'basic';

  constructor(
    private subscriptionService: SubscriptionService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private alert: AlertService
  ) {
    this.planForm = this.buildForm(null);
  }

  ngOnInit(): void {
    this.loadPlans();
  }

  // ── FormArray accessor ──────────────────────────────────────────────────
  get featuresArray(): FormArray {
    return this.planForm.get('features') as FormArray;
  }

  // ── Build Reactive Form ─────────────────────────────────────────────────
  private buildForm(plan: SubscriptionPlan | null): FormGroup {
    const group = this.fb.group({
      id:                    [plan?.id ?? '',                plan ? [] : [Validators.required, Validators.pattern(/^[a-z0-9_-]+$/)]],
      name:                  [plan?.name || '',              Validators.required],
      badge:                 [plan?.badge || 'STANDARD TIER', Validators.required],
      monthlyPrice:          [plan?.monthlyPrice ?? 299,     [Validators.required, Validators.min(0)]],
      yearlyPrice:           [plan?.yearlyPrice ?? 2499,     [Validators.required, Validators.min(0)]],
      description:           [plan?.description || '',       Validators.required],
      hasFreeTrial:          [plan !== null ? plan.hasFreeTrial : true],
      freeTrialDays:         [plan?.freeTrialDays ?? 14,     [Validators.required, Validators.min(0)]],
      recommended:           [plan !== null ? plan.recommended : false],
      razorpayPlanIdMonthly: [plan?.razorpayPlanIdMonthly || ''],
      razorpayPlanIdYearly:  [plan?.razorpayPlanIdYearly  || ''],
      features:              this.fb.array([])
    });

    const initialFeatures: { text: string; highlight: boolean }[] = plan?.features?.length ? plan.features as any : [
      { text: 'Up to 5,000 SKUs & 2 Branches', highlight: false },
      { text: '10 team user accounts',          highlight: false },
      { text: 'Automated GST e-invoicing',      highlight: false },
      { text: '14-Day Free Full-Access Trial',  highlight: true  }
    ];

    initialFeatures.forEach(f => {
      (group.get('features') as FormArray).push(this.createFeatureGroup(f.text, !!f.highlight));
    });

    return group;
  }

  private createFeatureGroup(text = '', highlight = false): FormGroup {
    return this.fb.group({
      text:      [text, Validators.required],
      highlight: [highlight]
    });
  }

  // ── Feature CRUD ────────────────────────────────────────────────────────
  addFeature(text = '', highlight = false): void {
    this.featuresArray.push(this.createFeatureGroup(text, highlight));
    this.cdr.markForCheck();
  }

  removeFeature(index: number): void {
    if (this.featuresArray.length > 1) {
      this.featuresArray.removeAt(index);
      this.cdr.markForCheck();
    }
  }

  // ── Navigation ──────────────────────────────────────────────────────────
  openForm(plan?: any): void {
    this.activeFormTab = 'basic';
    const rawPlan: SubscriptionPlan | null = plan ? {
      id:                    plan.id,
      name:                  plan.name,
      badge:                 plan.badge,
      monthlyPrice:          Number(plan.monthlyPrice) || 0,
      yearlyPrice:           Number(plan.yearlyPrice)  || 0,
      description:           plan.description || '',
      features:              plan.features || [],
      hasFreeTrial:          plan.hasFreeTrial ?? true,
      freeTrialDays:         Number(plan.freeTrialDays) || 14,
      recommended:           plan.recommended ?? false,
      razorpayPlanIdMonthly: plan.razorpayPlanIdMonthly || '',
      razorpayPlanIdYearly:  plan.razorpayPlanIdYearly  || ''
    } : null;

    this.editingPlan = rawPlan;
    this.planForm    = this.buildForm(rawPlan);
    this.Subscription_Form = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closeForm(): void {
    this.Subscription_Form = false;
    this.editingPlan = null;
    this.planForm = this.buildForm(null);
    this.activeFormTab = 'basic';
  }

  setTab(tab: 'basic' | 'pricing' | 'features'): void {
    this.activeFormTab = tab;
  }

  // ── Save (Create / Update) ──────────────────────────────────────────────
  savePlan(): void {
    if (this.planForm.invalid) {
      this.planForm.markAllAsTouched();
      this.alert.error('Please fill in all required fields before saving.');
      return;
    }

    const payload: SubscriptionPlan = {
      ...this.planForm.value,
      features: this.featuresArray.value
    };

    this.isLoading = true;

    if (this.editingPlan?.id) {
      this.subscriptionService.updatePlan(this.editingPlan.id, payload).subscribe({
        next: () => {
          this.alert.success('Subscription plan updated successfully');
          this.closeForm();
          this.loadPlans();
        },
        error: (err) => {
          console.error('[SubscriptionPlans] updatePlan failed', err);
          this.alert.error('Failed to update subscription plan. Please try again.');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      this.subscriptionService.createPlan(payload).subscribe({
        next: () => {
          this.alert.success('Subscription plan created successfully');
          this.closeForm();
          this.loadPlans();
        },
        error: (err) => {
          console.error('[SubscriptionPlans] createPlan failed', err);
          this.alert.error('Failed to create subscription plan. Please try again.');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  // ── Load Plans ──────────────────────────────────────────────────────────
  loadPlans(): void {
    this.isLoading = true;
    this.subscriptionService.getPlans().subscribe({
      next: (res: any) => {
        const rawPlans: SubscriptionPlan[] = Array.isArray(res)
          ? res
          : (res?.data && Array.isArray(res.data) ? res.data : []);

        this.plans = rawPlans.map(p => ({
          ...p,
          _monthlyPriceStr: p.monthlyPrice === 0 ? 'Custom'   : `₹${p.monthlyPrice.toLocaleString('en-IN')} / mo`,
          _yearlyPriceStr:  p.yearlyPrice  === 0 ? 'Custom'   : `₹${p.yearlyPrice.toLocaleString('en-IN')} / yr`,
          _freeTrialStr:    p.hasFreeTrial         ? `${p.freeTrialDays} Days` : 'No Trial',
          _recommendedStr:  p.recommended           ? '★ Featured' : 'Standard'
        }));

        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('[SubscriptionPlans] loadPlans failed', err);
        this.alert.error('Failed to load subscription plans. Check API connectivity.');
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ── Delete Plan ──────────────────────────────────────────────────────────
  deletePlan(planOrId: any): void {
    const id   = typeof planOrId === 'string' ? planOrId : (planOrId?.id ?? String(planOrId));
    const name = typeof planOrId === 'object' ? (planOrId?.name ?? id) : id;

    this.alert.confirm(`Delete "${name}"? This action cannot be undone.`).then(result => {
      if (!result.isConfirmed) return;
      this.isLoading = true;
      this.subscriptionService.deletePlan(id).subscribe({
        next: () => {
          this.alert.success(`"${name}" subscription plan deleted successfully`);
          this.loadPlans();
        },
        error: (err) => {
          console.error('[SubscriptionPlans] deletePlan failed', err);
          this.alert.error('Failed to delete subscription plan.');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
    });
  }

  // ── Live Preview Computed Value ──────────────────────────────────────────
  get livePreviewPlan(): SubscriptionPlan {
    const v = this.planForm.value;
    return {
      id:                    v.id          || 'new-tier',
      name:                  v.name        || 'Plan Name',
      badge:                 v.badge       || 'TIER BADGE',
      monthlyPrice:          Number(v.monthlyPrice) || 0,
      yearlyPrice:           Number(v.yearlyPrice)  || 0,
      description:           v.description || 'Enterprise ERP access suite.',
      features:              this.featuresArray.value || [],
      hasFreeTrial:          !!v.hasFreeTrial,
      freeTrialDays:         Number(v.freeTrialDays) || 14,
      recommended:           !!v.recommended,
      razorpayPlanIdMonthly: v.razorpayPlanIdMonthly || '',
      razorpayPlanIdYearly:  v.razorpayPlanIdYearly  || ''
    };
  }

  // ── Stats Calculation ────────────────────────────────────────────────────
  getFeaturedCount(): number {
    return this.plans.filter(p => p.recommended).length;
  }
}
