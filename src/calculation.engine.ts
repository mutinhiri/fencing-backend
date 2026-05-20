import { PricingTemplate } from '../templates/template.entity';

export interface PostBreakdown {
  cornerPosts: number;
  middlePosts: number;
  totalRoundPosts: number;
  standardPoles: number;
  segments: number;
  segmentLength: number;
}

export interface MaterialLine {
  id: string;
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface QuoteCalculation {
  metres: number;
  height: string;
  posts: PostBreakdown;
  strainWireMetres: number;
  tyingWireKg: number;
  cementBags: number;
  quarryWheelbarrows: number;
  sandWheelbarrows: number;
  supportingPosts: number;
  labourCost: number;
  materials: MaterialLine[];
  subtotal: number;
  vat: number;
  grand: number;
}

export interface SqmConversion {
  sqm: number;
  width: number;
  height: number;
  perimeter: number;
}

export function sqmToMetres(sqm: number): SqmConversion {
  // Approximate rectangle via golden ratio (width ≈ √(sqm × 0.75))
  const w = Math.round(Math.sqrt(sqm * 0.75));
  const h = Math.round(sqm / w);
  return { sqm, width: w, height: h, perimeter: 2 * (w + h) };
}

export function calculatePosts(metres: number): PostBreakdown {
  const cornerPosts = 2;

  // Increase segments until no gap exceeds 20m
  let segments = 1;
  while (metres / segments > 20) {
    segments++;
  }
  const middlePosts = segments - 1;

  const segmentLength = metres / segments;

  // Standard poles every 5m within each segment (not counting end posts)
  const polesPerSegment = Math.max(0, Math.floor(segmentLength / 5) - 1);
  const standardPoles = polesPerSegment * segments;

  return {
    cornerPosts,
    middlePosts,
    totalRoundPosts: cornerPosts + middlePosts,
    standardPoles,
    segments,
    segmentLength: parseFloat(segmentLength.toFixed(2)),
  };
}

export function calculateMaterials(
  metres: number,
  height: string, // "1.8" | "1.5" | "1.2"
  template: PricingTemplate,
): QuoteCalculation {
  const posts = calculatePosts(metres);
  const heightKey = `height_${height.replace('.', '_')}`;

  // Material quantities
  const strainWireMetres = metres * 3;
  const tyingWireKg = Math.ceil(metres / 6);
  const cementBags = Math.ceil(posts.totalRoundPosts / 4);
  const quarryWheelbarrows = posts.totalRoundPosts * 0.5;
  const sandWheelbarrows = posts.totalRoundPosts * 0.25;
  const supportingPosts = posts.totalRoundPosts * 2;

  // Prices from template
  const roundPostPrice: number = template[`roundPost_${heightKey}`] ?? template.roundPost_height_1_8;
  const standardPostPrice: number = template[`standardPost_${heightKey}`] ?? template.standardPost_height_1_8;

  const materials: MaterialLine[] = [
    {
      id: 'round_posts',
      name: `Round posts (${height}m)`,
      qty: posts.totalRoundPosts,
      unit: 'each',
      unitPrice: roundPostPrice,
      total: posts.totalRoundPosts * roundPostPrice,
    },
    {
      id: 'standard_poles',
      name: `Standard poles (${height}m)`,
      qty: posts.standardPoles,
      unit: 'each',
      unitPrice: standardPostPrice,
      total: posts.standardPoles * standardPostPrice,
    },
    {
      id: 'supporting_posts',
      name: 'Supporting posts',
      qty: supportingPosts,
      unit: 'each',
      unitPrice: template.supportingPostPrice,
      total: supportingPosts * template.supportingPostPrice,
    },
    {
      id: 'strain_wire',
      name: 'Plain strain wire (3 strands)',
      qty: strainWireMetres,
      unit: 'm',
      unitPrice: template.strainWirePerMetre,
      total: strainWireMetres * template.strainWirePerMetre,
    },
    {
      id: 'tying_wire',
      name: 'Tying wire',
      qty: tyingWireKg,
      unit: 'kg',
      unitPrice: template.tyingWirePerKg,
      total: tyingWireKg * template.tyingWirePerKg,
    },
    {
      id: 'cement',
      name: 'Cement (1 bag / 4 round posts)',
      qty: cementBags,
      unit: 'bags',
      unitPrice: template.cementPerBag,
      total: cementBags * template.cementPerBag,
    },
    {
      id: 'quarry_stones',
      name: 'Quarry stones (½ wheelbarrow / post)',
      qty: quarryWheelbarrows,
      unit: 'wheelbarrows',
      unitPrice: template.quarryPerWheelbarrow,
      total: quarryWheelbarrows * template.quarryPerWheelbarrow,
    },
    {
      id: 'river_sand',
      name: 'River sand (¼ wheelbarrow / post)',
      qty: sandWheelbarrows,
      unit: 'wheelbarrows',
      unitPrice: template.sandPerWheelbarrow,
      total: sandWheelbarrows * template.sandPerWheelbarrow,
    },
    {
      id: 'labour',
      name: 'Labour',
      qty: metres,
      unit: 'm',
      unitPrice: template.labourPerMetre,
      total: metres * template.labourPerMetre,
    },
  ];

  const subtotal = materials.reduce((s, m) => s + m.total, 0);
  const vat = subtotal * (template.vatPercent / 100);
  const grand = subtotal + vat;

  return {
    metres,
    height,
    posts,
    strainWireMetres,
    tyingWireKg,
    cementBags,
    quarryWheelbarrows,
    sandWheelbarrows,
    supportingPosts,
    labourCost: metres * template.labourPerMetre,
    materials,
    subtotal,
    vat,
    grand,
  };
}