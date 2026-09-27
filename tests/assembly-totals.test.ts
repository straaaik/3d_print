import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateAssemblyTotals } from '../src/shared/lib/formulas';
import { AssemblyPrintedPart, AssemblyHardwareItem, AssemblyElectronicsItem } from '../src/shared/types';

describe('calculateAssemblyTotals with electronics', () => {
  it('correctly sums electronics base cost and final price into grand totals', () => {
    const parts: AssemblyPrintedPart[] = [
      {
        name: 'Корпус',
        weight_g: 100,
        hours: 2,
        minutes: 0,
        quantity: 1,
        base_cost: 200,
        final_price: 500,
      },
    ];
    const hardware: AssemblyHardwareItem[] = [
      {
        id: 'hw-1',
        name: 'Винт M3',
        quantity: 4,
        cost_per_unit: 5,
        price_per_unit: 10,
      },
    ];
    const electronics: AssemblyElectronicsItem[] = [
      {
        id: 'el-1',
        name: 'Сервопривод SG90',
        quantity: 2,
        cost_per_unit: 150,
        price_per_unit: 300,
      },
    ];

    const result = calculateAssemblyTotals(parts, hardware, 30, 600, false, electronics);

    assert.equal(result.partsBaseCost, 200);
    assert.equal(result.hwBaseCost, 20);
    assert.equal(result.electronicsBaseCost, 300);
    assert.equal(result.totalElectronicsPieces, 2);
    assert.equal(result.grandBaseCost, 200 + 20 + 300 + 300); // 820
    assert.equal(result.electronicsFinalPrice, 600);
    assert.equal(result.grandFinalPrice, 500 + 40 + 600 + 300); // 1440
  });
});
