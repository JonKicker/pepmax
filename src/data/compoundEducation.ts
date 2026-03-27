// src/data/compoundEducation.ts
// Compound education content for all 38 compounds in PepMax.
// Tier 1 (thorough): semaglutide, tirzepatide, liraglutide, dulaglutide, retatrutide, exenatide
// Tier 2 (standard): sermorelin, tesamorelin, cjc-1295-with-dac, cjc-1295-no-dac--mod-grf-1-29,
//   ipamorelin, mk-677-ibutamoren, bpc-157, tb-500-thymosin-beta-4, pt-141-bremelanotide-research,
//   melanotan-ii-mt-2, thymosin-alpha-1-ta-1, ghk-cu-copper-peptide, aod-9604
// Tier 3 (minimum): all remaining 19 compounds

import type { CompoundEducation } from '../types/education';

const COMPOUND_EDUCATION: Record<string, CompoundEducation> = {

'semaglutide': {
    compoundId: 'semaglutide',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nSemaglutide is a glucagon-like peptide-1 (GLP-1) receptor agonist — a synthetic version of a hormone your gut naturally releases after eating. When you eat, your intestines secrete GLP-1 to tell your pancreas to release insulin, signal your brain that you're full, and slow down how quickly food leaves your stomach. Semaglutide mimics all three of these effects, but because it's been chemically modified with a fatty-acid chain, it stays active in your body for about a week rather than the few minutes natural GLP-1 lasts. This makes once-weekly injections practical.\n\nOriginally approved for type 2 diabetes under the brand name Ozempic (0.5–2 mg weekly), semaglutide gained enormous attention when higher doses (2.4 mg weekly, brand name Wegovy) demonstrated average weight loss of ~15% of body weight in the STEP trials — roughly double what older weight-loss medications achieved. An oral formulation (Rybelsus, 3–14 mg daily) is also FDA-approved for diabetes. Compounded injectable semaglutide has become widely used in wellness settings at doses that mirror the Wegovy titration schedule.\n\nBeyond weight and blood sugar, semaglutide has shown cardiovascular benefits: the SELECT trial (2023) demonstrated a 20% reduction in major adverse cardiovascular events in people with obesity but without diabetes. Research into its effects on addiction, fatty liver disease (NASH/MASH), kidney disease, and even neurodegeneration is ongoing, making it one of the most actively studied drug classes in modern medicine.`,
    mechanismDetail: `Semaglutide binds to GLP-1 receptors found throughout the body — most importantly in pancreatic beta cells, the hypothalamus, the brainstem, the stomach, and the heart. In the pancreas, receptor activation triggers glucose-dependent insulin secretion (meaning it only prompts insulin release when blood sugar is actually elevated, reducing hypoglycemia risk) and suppresses glucagon, the hormone that raises blood sugar. In the gut, it slows gastric emptying, so food moves more slowly from stomach to small intestine, blunting post-meal glucose spikes and extending satiety. In the brain — particularly the hypothalamus and nucleus accumbens — GLP-1 receptor activation reduces appetite signals and appears to dampen reward-driven eating. The half-life of ~1 week comes from a C18 fatty-acid chain attached to the molecule, which binds reversibly to albumin in the blood, protecting it from enzymatic degradation.`,
    commonProtocols: [
      {
        name: 'Standard Weight Management Titration',
        description: 'The FDA-approved Wegovy titration schedule. Doses are increased gradually over 16 weeks to minimize gastrointestinal side effects. Most people find their "sweet spot" between 1.0 mg and 2.4 mg. Some never need to reach the full 2.4 mg dose.',
        schedule: 'Weekly subcutaneous injection, rotating sites (abdomen, thigh, upper arm)',
        duration: '16-week titration, then indefinite maintenance',
        startingDose: '0.25',
        maintenanceDose: '2.4',
        unit: 'mg',
        frequency: 'weekly',
      },
      {
        name: 'Diabetes Management Protocol',
        description: 'The Ozempic titration for blood glucose control. Maintenance is typically 1–2 mg weekly. Combined with lifestyle changes, this protocol has shown HbA1c reductions of 1.5–1.8%.',
        schedule: 'Weekly subcutaneous injection on the same day each week',
        duration: '8-week titration, then ongoing',
        startingDose: '0.25',
        maintenanceDose: '2.0',
        unit: 'mg',
        frequency: 'weekly',
      },
      {
        name: 'Conservative Low-Dose Protocol',
        description: 'Some practitioners prefer a slower titration or lower maintenance dose, particularly for lean individuals using semaglutide for metabolic health rather than significant weight loss. Doses between 0.5–1.0 mg often provide meaningful benefits with fewer side effects.',
        schedule: 'Weekly subcutaneous injection',
        duration: '8-week titration to target, then reassess quarterly',
        startingDose: '0.125',
        maintenanceDose: '1.0',
        unit: 'mg',
        frequency: 'weekly',
      },
    ],
    safetyNotes: [
      'The most common side effects are nausea, vomiting, diarrhea, and constipation — these are dose-dependent and typically improve within 4–8 weeks of reaching a new dose tier. Taking your injection before bed and eating smaller, lower-fat meals can help.',
      'Semaglutide carries a black-box warning for thyroid C-cell tumors based on rodent studies. It is contraindicated in people with a personal or family history of medullary thyroid carcinoma (MTC) or Multiple Endocrine Neoplasia syndrome type 2 (MEN 2). The relevance to humans is currently unclear, but the warning stands.',
      'Pancreatitis has been reported. Discontinue and seek medical care immediately if you experience severe, persistent abdominal pain radiating to the back, especially if accompanied by vomiting.',
      'Muscle mass loss: rapid weight loss on GLP-1 agonists can include significant lean mass loss, not just fat. Pairing semaglutide with resistance training and high protein intake (1.6–2.2 g/kg body weight) is strongly recommended to preserve muscle.',
      'Gastroparesis risk: because semaglutide slows gastric emptying, it can cause or worsen gastroparesis. People undergoing general anesthesia have aspirated stomach contents even after standard fasting periods — inform your anesthesiologist you are on this medication.',
      'Drug interactions: semaglutide slows absorption of oral medications. Timing of oral contraceptives, thyroid medications, and other time-sensitive drugs may need adjustment — discuss with your prescriber.',
    ],
    stackingInfo: `Semaglutide is often combined with other compounds to offset side effects or enhance results. The most evidence-based combination is with resistance training and creatine monohydrate to counteract muscle loss. Some practitioners stack it with MK-677 (ibutamoren) to boost growth hormone and IGF-1, theoretically protecting lean mass — though this combination is not clinically validated and the appetite-stimulating effects of MK-677 work somewhat against semaglutide. BPC-157 is sometimes added to address GI side effects, though evidence is anecdotal. Combining with other GLP-1 agonists or GIP/GLP-1 agonists (like tirzepatide) is contraindicated — do not use multiple agents from this class simultaneously. Thyroid hormone (T3/T4) optimization is sometimes pursued alongside GLP-1 therapy since hypothyroidism blunts weight-loss response. Always discuss any stacking strategy with a knowledgeable provider.`,
    storageDetail: `Unopened pens or vials: refrigerate at 2–8°C (36–46°F). Do not freeze. Once in use (opened vials or pen in use): can be kept at room temperature (below 30°C/86°F) or refrigerated for up to 56 days for Ozempic pens, or up to 28 days for Wegovy. Compounded semaglutide vials: follow the compounding pharmacy's specific guidance — typically refrigerated and used within 28–90 days depending on formulation and preservatives. Protect from light. Discard if solution is cloudy, discolored, or contains particles.`,
    researchStatus: `FDA-approved (NDA/BLA) for type 2 diabetes (Ozempic, oral Rybelsus) and chronic weight management (Wegovy). Extensive Phase 3 clinical trial data exists across the SUSTAIN (diabetes) and STEP (obesity) trial programs. Cardiovascular outcomes established in SUSTAIN-6 and the SELECT trial. Active research in NASH/MASH (liver disease), chronic kidney disease, heart failure, alcohol use disorder, Alzheimer's disease, and Parkinson's disease. Compounded versions are available through licensed compounding pharmacies in many jurisdictions but are not FDA-approved finished drug products.`,
    references: [
      {
        title: 'Once-Weekly Semaglutide in Adults with Overweight or Obesity (STEP 1 Trial)',
        source: 'New England Journal of Medicine',
        year: 2021,
      },
      {
        title: 'Semaglutide and Cardiovascular Outcomes in Obesity without Diabetes (SELECT Trial)',
        source: 'New England Journal of Medicine',
        year: 2023,
      },
      {
        title: 'Semaglutide 2.4 mg once a week in adults with overweight or obesity, and type 2 diabetes (STEP 2)',
        source: 'The Lancet',
        year: 2021,
      },
      {
        title: 'Oral Semaglutide versus Subcutaneous Semaglutide and Placebo in Type 2 Diabetes (PIONEER 1)',
        source: 'Diabetes Care',
        year: 2019,
      },
    ],
    faqs: [
      {
        question: 'How long does it take for semaglutide to start working?',
        answer: 'Most people notice reduced appetite within the first 1–2 weeks at even the starting 0.25 mg dose. Measurable weight loss typically begins by week 4–8. The full effect at any given dose takes 4–5 weeks to stabilize, which is why the titration schedule waits 4 weeks between dose increases.',
      },
      {
        question: 'Will I regain weight when I stop semaglutide?',
        answer: 'The STEP 4 trial showed that people who stopped semaglutide after 20 weeks regained about two-thirds of their lost weight within a year. Obesity is a chronic condition, and GLP-1 agonists appear to work only while you take them — similar to how blood pressure medication only works while you\'re on it. Many people treat this as long-term therapy.',
      },
      {
        question: 'Can semaglutide cause muscle loss?',
        answer: 'Yes. Studies show roughly 25–40% of weight lost on semaglutide can be lean mass (muscle and water), not just fat — especially without resistance training. This is why combining semaglutide with strength training and high protein intake is so important. Some researchers are studying whether adding tirzepatide (which has GIP activity) preserves more lean mass.',
      },
      {
        question: 'What is the difference between Ozempic and Wegovy?',
        answer: 'Both contain the same molecule (semaglutide), but Wegovy is FDA-approved for weight management at a maximum dose of 2.4 mg weekly, while Ozempic is approved for type 2 diabetes at a maximum of 2 mg weekly. The titration schedules are slightly different. Ozempic is sometimes prescribed off-label for weight loss, which has contributed to shortages.',
      },
    ],
  },

  'tirzepatide': {
    compoundId: 'tirzepatide',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nTirzepatide is the first approved "dual agonist" — a single molecule that activates both the GLP-1 (glucagon-like peptide-1) receptor and the GIP (glucose-dependent insulinotropic polypeptide) receptor simultaneously. GIP is another gut hormone released after eating; like GLP-1, it stimulates insulin secretion, but it also acts on fat tissue to regulate fat storage and may play a role in appetite signaling. By hitting both receptors, tirzepatide appears to produce greater weight loss than GLP-1-only agonists. In the SURMOUNT-1 trial, the highest dose (15 mg weekly) produced average weight loss of ~22.5% of body weight — approaching what bariatric surgery achieves.\n\nApproved as Mounjaro for type 2 diabetes (2022) and as Zepbound for chronic weight management (2023), tirzepatide has rapidly become a benchmark compound for both indications. It's administered as a once-weekly subcutaneous injection and follows a gradual titration schedule starting at 2.5 mg. Compounded versions became widely available during manufacturer shortages. Beyond weight and glycemic control, tirzepatide is being studied for sleep apnea (SURMOUNT-OSA demonstrated significant reductions in apnea severity), heart failure, fatty liver disease, and kidney disease.\n\nA key differentiator from semaglutide is that tirzepatide appears to preserve lean muscle mass somewhat better, possibly due to the GIP receptor's effects on adipose tissue partitioning — though direct head-to-head lean mass data is still emerging. The SURMOUNT-4 trial confirmed that discontinuing tirzepatide leads to weight regain, reinforcing that ongoing therapy is typically needed.`,
    mechanismDetail: `Tirzepatide is a 39-amino-acid synthetic peptide engineered as a "twincretin" — a single molecule with activity at both GLP-1R and GIPR. The GLP-1 component drives insulin secretion, glucagon suppression, gastric emptying delay, and central appetite reduction (same mechanism as semaglutide). The GIP component adds incretin effect from a different receptor, and importantly, GIP receptors on adipocytes (fat cells) appear to improve fat metabolism and may reduce lipotoxicity (damage caused by excess fat in non-fat tissues). The molecule has a C20 fatty-acid chain providing ~5-day half-life and enabling weekly dosing. Interestingly, while GIP alone can stimulate appetite in some contexts, in the tirzepatide dual-agonist context it appears to synergize with GLP-1 to reduce food intake beyond what GLP-1 alone achieves.`,
    commonProtocols: [
      {
        name: 'SURMOUNT/Zepbound Weight Management Titration',
        description: 'The FDA-approved titration schedule for weight management. The 2.5 mg starting dose is sub-therapeutic — it exists purely to help your body adapt and minimize nausea. Most people need at least 10–15 mg to see peak weight loss. Titrate slowly if side effects are bothersome.',
        schedule: 'Weekly subcutaneous injection, rotating sites (abdomen, thigh, upper arm)',
        duration: '20-week titration, then indefinite maintenance',
        startingDose: '2.5',
        maintenanceDose: '15',
        unit: 'mg',
        frequency: 'weekly',
      },
      {
        name: 'Diabetes Management Protocol (Mounjaro)',
        description: 'Titration for blood glucose control. Maintenance doses of 5–15 mg weekly have shown HbA1c reductions of 1.8–2.4% in trials. Even 5 mg produces meaningful glycemic benefit for many people.',
        schedule: 'Weekly subcutaneous injection on the same day each week',
        duration: '12-week titration, then ongoing',
        startingDose: '2.5',
        maintenanceDose: '10',
        unit: 'mg',
        frequency: 'weekly',
      },
      {
        name: 'Conservative Titration for GI-Sensitive Individuals',
        description: 'For people who experience significant nausea at standard titration speeds. Extending each dose level to 6–8 weeks before increasing can dramatically improve tolerability while still achieving therapeutic doses.',
        schedule: 'Weekly subcutaneous injection; hold at each dose level 6–8 weeks instead of 4',
        duration: '28–32 week titration to target dose',
        startingDose: '2.5',
        maintenanceDose: '10',
        unit: 'mg',
        frequency: 'weekly',
      },
    ],
    safetyNotes: [
      'GI side effects (nausea, diarrhea, vomiting, constipation) are the most common adverse effects and are most pronounced during dose escalation. They typically subside within 2–4 weeks of reaching a stable dose. Eating smaller portions, avoiding high-fat foods on injection days, and staying well-hydrated helps significantly.',
      'Same black-box thyroid C-cell tumor warning as semaglutide: contraindicated in people with personal or family history of medullary thyroid carcinoma or MEN 2 syndrome.',
      'Pancreatitis risk: same caution as with all GLP-1 agonists — discontinue immediately if you experience severe abdominal pain radiating to the back.',
      'Hypoglycemia: tirzepatide alone rarely causes low blood sugar because its insulin stimulation is glucose-dependent. However, when combined with insulin or sulfonylureas, hypoglycemia risk increases substantially. Dose reductions of those agents are typically required when starting tirzepatide.',
      'Muscle mass: despite tirzepatide potentially preserving lean mass better than semaglutide, resistance training and adequate protein intake remain essential. Rapid weight loss of any kind risks lean mass loss.',
      'Gallbladder disease: rapid weight loss with any GLP-1 agonist increases risk of gallstones. Report right-sided abdominal pain to your doctor.',
    ],
    stackingInfo: `Tirzepatide should not be combined with other GLP-1 agonists (semaglutide, liraglutide, etc.) or GIP agonists. Its combination with insulin requires careful dose adjustments to prevent hypoglycemia. In the wellness/performance community, tirzepatide is sometimes paired with resistance training programs, creatine, and high-protein diets to maximize fat loss while preserving muscle. Some practitioners combine it with testosterone optimization (TRT) in men, as testosterone also helps preserve lean mass during caloric deficit. MK-677 is occasionally added with the rationale of boosting IGF-1 and GH to offset lean mass loss, though this remains anecdotal. Metformin combined with tirzepatide may provide additive metabolic benefits and is being studied formally. Do not stack with other appetite-suppressing compounds without medical supervision.`,
    storageDetail: `Refrigerate at 2–8°C (36–46°F). Do not freeze — freezing destroys the peptide. Once removed from the refrigerator, pens or vials can be stored at room temperature (up to 30°C/86°F) for up to 21 days for Mounjaro/Zepbound. Compounded tirzepatide vials: follow compounding pharmacy instructions, typically refrigerate and use within 28–60 days. Keep away from direct sunlight and heat sources. Discard if solution is cloudy, colored, or contains visible particles.`,
    researchStatus: `FDA-approved for type 2 diabetes (Mounjaro, 2022) and chronic weight management (Zepbound, 2023). Extensive Phase 3 data from the SURPASS (diabetes) and SURMOUNT (obesity) trial programs. SURMOUNT-OSA showed significant reduction in obstructive sleep apnea severity. Active research in heart failure with preserved ejection fraction (HFpEF), NASH/MASH, chronic kidney disease, and polycystic ovary syndrome (PCOS). A triple agonist successor (retatrutide, adding glucagon receptor) is in Phase 3 trials.`,
    references: [
      {
        title: 'Tirzepatide Once Weekly for the Treatment of Obesity (SURMOUNT-1)',
        source: 'New England Journal of Medicine',
        year: 2022,
      },
      {
        title: 'Tirzepatide versus Semaglutide Once Weekly in Patients with Type 2 Diabetes (SURPASS-2)',
        source: 'New England Journal of Medicine',
        year: 2021,
      },
      {
        title: 'Tirzepatide for the Treatment of Obstructive Sleep Apnea and Obesity (SURMOUNT-OSA)',
        source: 'New England Journal of Medicine',
        year: 2024,
      },
      {
        title: 'Sustained Weight Reduction with Tirzepatide — SURMOUNT-4 Trial',
        source: 'JAMA',
        year: 2024,
      },
    ],
    faqs: [
      {
        question: 'Is tirzepatide stronger than semaglutide?',
        answer: 'In terms of average weight loss, yes — tirzepatide at 15 mg weekly produces roughly 20–22% body weight loss on average, compared to ~15% for semaglutide 2.4 mg weekly in their respective trials. A direct head-to-head trial (SURMOUNT-5) confirmed tirzepatide\'s superiority for weight loss. However, individual responses vary considerably, and some people do better on semaglutide.',
      },
      {
        question: 'Does tirzepatide preserve more muscle than semaglutide?',
        answer: 'Preliminary data suggests tirzepatide may preserve a slightly higher proportion of lean mass during weight loss, possibly related to its GIP receptor activity on adipose tissue. However, both drugs cause meaningful lean mass loss without resistance training. The definitive comparison requires more head-to-head studies with DEXA body composition measurement.',
      },
      {
        question: 'What is the 2.5 mg starting dose actually doing?',
        answer: 'Very little therapeutically — it\'s a tolerance-building step. The 2.5 mg dose is intentionally sub-therapeutic to let your GI tract adapt to the drug and minimize early nausea and vomiting. The real weight loss effects kick in at 5 mg and above. Think of it like the first week of a new exercise program where you go easy to avoid injury.',
      },
      {
        question: 'Can tirzepatide be used if I don\'t have diabetes or obesity?',
        answer: 'Tirzepatide is FDA-approved specifically for type 2 diabetes and for obesity (BMI ≥30) or overweight (BMI ≥27) with at least one weight-related condition. Off-label use exists but is a medical decision. Its use purely for body composition optimization in lean, metabolically healthy individuals is not supported by clinical trial data and carries the same risk profile without established benefit.',
      },
    ],
  },

  'liraglutide': {
    compoundId: 'liraglutide',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nLiraglutide was the first GLP-1 receptor agonist to receive FDA approval for chronic weight management (Saxenda, 3 mg daily, approved 2014), making it the pioneer of the GLP-1 weight-loss drug class before semaglutide and tirzepatide arrived. It's also approved for type 2 diabetes (Victoza, up to 1.8 mg daily) and is the only GLP-1 agonist with FDA approval for obesity in adolescents aged 12 and older. Because it requires daily injections rather than weekly, it has largely been superseded by semaglutide in clinical practice, but it remains relevant for patients who need more flexible dosing, have specific tolerability profiles, or are in regions where newer agents are unavailable.\n\nThe SCALE Obesity and Prediabetes trial showed average weight loss of ~8% of body weight at 3 mg daily — lower than semaglutide or tirzepatide but still clinically meaningful. Liraglutide also demonstrated cardiovascular benefit in the LEADER trial (2016), reducing major adverse cardiovascular events in people with type 2 diabetes, providing the first CV outcomes data for the GLP-1 class. Its daily dosing, while less convenient, provides some practitioners with tighter control over dose management.\n\nLiraglutide shares the same mechanism as other GLP-1 agonists: it's a modified version of human GLP-1 with a C16 fatty acid chain that extends its half-life to ~13 hours (requiring daily dosing versus semaglutide's ~1-week half-life). It binds to GLP-1 receptors in the pancreas, gut, and brain to reduce appetite, slow gastric emptying, and improve insulin secretion.`,
    mechanismDetail: `Liraglutide is a 97% homologous analog of human GLP-1, with a single amino acid substitution (Arg34Lys) and addition of a C16 palmitic acid chain via a glutamic acid spacer. This fatty acid attachment allows liraglutide to bind to albumin in the bloodstream, protecting it from the enzyme DPP-4 that would otherwise break it down within minutes. The result is a half-life of approximately 13 hours — long enough for once-daily dosing. Mechanistically identical to other GLP-1 agonists at the receptor level: stimulates glucose-dependent insulin secretion, suppresses glucagon, slows gastric emptying, and activates satiety centers in the hypothalamus and brainstem. At the higher 3 mg dose (Saxenda), central appetite suppression is the dominant weight-loss mechanism.`,
    commonProtocols: [
      {
        name: 'Saxenda Weight Management Titration',
        description: 'The FDA-approved once-daily protocol for weight management. The titration over 5 weeks minimizes GI side effects. Most weight loss occurs at the 3 mg maintenance dose. Inject at the same time each day — many prefer morning before breakfast or evening.',
        schedule: 'Daily subcutaneous injection at consistent time each day',
        duration: '5-week titration, then indefinite maintenance',
        startingDose: '0.6',
        maintenanceDose: '3.0',
        unit: 'mg',
        frequency: 'daily',
      },
      {
        name: 'Victoza Diabetes Protocol',
        description: 'Lower-dose daily protocol for blood glucose management. The 1.8 mg dose provides maximum glycemic benefit. Weight loss at this dose is modest (~2–5 kg average) but cardiovascular benefits are significant.',
        schedule: 'Daily subcutaneous injection, any time of day, with or without food',
        duration: '2-week titration, then ongoing',
        startingDose: '0.6',
        maintenanceDose: '1.8',
        unit: 'mg',
        frequency: 'daily',
      },
    ],
    safetyNotes: [
      'Daily injections increase the burden of injection-site reactions compared to weekly agents. Rotate between abdomen, thigh, and upper arm to prevent lipohypertrophy (lumpy scar tissue that impairs absorption).',
      'Same thyroid C-cell tumor black-box warning as all GLP-1 agonists: contraindicated in personal or family history of medullary thyroid carcinoma or MEN 2.',
      'The LEADER trial established cardiovascular benefits, but also noted slightly higher rates of gallbladder-related adverse events — rapid weight loss increases bile cholesterol saturation and gallstone risk.',
      'If a daily dose is missed by more than 12 hours, skip it and resume the next day — do not double-dose.',
      'Liraglutide has a pediatric obesity indication (12+ years old at 3 mg daily), but this use requires close monitoring and is specifically for those with BMI at or above the 95th percentile with weight-related comorbidities.',
    ],
    stackingInfo: `As with all GLP-1 agonists, liraglutide should not be combined with other GLP-1 receptor agonists or dual/triple agonists. The daily dosing of liraglutide makes it slightly easier to titrate in combination protocols than weekly agents. In practice, liraglutide is sometimes used as a "stepping stone" before transitioning to semaglutide or tirzepatide. Stacking with metformin is common in diabetes management. For body composition purposes, the same principles apply as with semaglutide: pair with resistance training and high protein intake. Some users combine with peptides like BPC-157 for GI comfort, though this is anecdotal. Vitamin B12 monitoring is recommended with long-term use, as liraglutide may slightly reduce B12 absorption.`,
    storageDetail: `Refrigerate at 2–8°C (36–46°F) before first use. After first use, store at room temperature (below 30°C/86°F) or in refrigerator — do not freeze. In-use pens can be stored for up to 30 days. Always store pen without needle attached. Protect from excessive heat and sunlight.`,
    researchStatus: `FDA-approved for type 2 diabetes (Victoza, 2010) and chronic weight management (Saxenda, 2014). FDA-approved for obesity in adolescents 12+ (Saxenda, 2020). Cardiovascular outcomes established in the LEADER trial (2016). The SCALE trial program provides the core weight management evidence base. Now largely considered a second-line agent for weight management given the superior efficacy of semaglutide and tirzepatide, but retains its approvals and niche uses.`,
    references: [
      {
        title: 'Liraglutide and Cardiovascular Outcomes in Type 2 Diabetes (LEADER Trial)',
        source: 'New England Journal of Medicine',
        year: 2016,
      },
      {
        title: 'A Randomized, Controlled Trial of 3.0 mg of Liraglutide in Weight Management (SCALE Obesity and Prediabetes)',
        source: 'New England Journal of Medicine',
        year: 2015,
      },
      {
        title: 'Liraglutide 3 mg for weight management in adolescents with obesity (SCALE teens)',
        source: 'New England Journal of Medicine',
        year: 2020,
      },
    ],
    faqs: [
      {
        question: 'Why would someone choose liraglutide over semaglutide given the daily injections?',
        answer: 'For some people, the shorter half-life is actually a feature: if side effects occur, they wear off within a day, while semaglutide side effects can persist for most of the week. Some patients also prefer having the ability to skip a dose without it mattering much, giving them more flexibility. Cost and availability can also factor in depending on insurance and region.',
      },
      {
        question: 'Is liraglutide safe for teenagers?',
        answer: 'Liraglutide (Saxenda) is FDA-approved for adolescents aged 12 and older with obesity (BMI ≥95th percentile) and at least one weight-related condition. The SCALE Teens trial demonstrated safety and efficacy in this population. However, use in adolescents requires close supervision by a pediatric endocrinologist or obesity medicine specialist.',
      },
      {
        question: 'How does liraglutide compare to the newer GLP-1 agents for weight loss?',
        answer: 'Liraglutide produces roughly 5–8% body weight loss on average. Semaglutide produces ~15% and tirzepatide ~20–22%. For most patients seeking maximum weight loss, the newer weekly agents are more effective and more convenient. However, individual responses vary — some people respond exceptionally well to liraglutide and may not gain additional benefit from switching.',
      },
    ],
  },

  'dulaglutide': {
    compoundId: 'dulaglutide',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nDulaglutide (brand name Trulicity) is a once-weekly GLP-1 receptor agonist approved for type 2 diabetes management. Unlike semaglutide, which is a modified GLP-1 peptide, dulaglutide is a fusion protein: two GLP-1 analogs are chemically linked to a modified human IgG4 antibody backbone (Fc fragment). This larger molecule structure gives it a half-life of about 5 days, enabling once-weekly dosing. The pre-filled, single-use autoinjector pen with a hidden needle has made it particularly popular among patients with needle anxiety.\n\nDulaglutide was approved for cardiovascular risk reduction in the REWIND trial (2019), which demonstrated a significant reduction in major adverse cardiovascular events in adults with type 2 diabetes — including people with relatively modest cardiovascular risk profiles, broader than the populations studied in earlier GLP-1 CV trials. This makes it notable for primary prevention in diabetic patients. Maximum approved dose is 4.5 mg weekly; the 0.75 mg starting dose is specifically designed to minimize GI effects.\n\nWhile dulaglutide produces meaningful weight loss (~2–4 kg on average at 1.5 mg; ~4–5 kg at 4.5 mg), it is generally not used as a primary weight management agent given the availability of more efficacious options. Its primary role remains glycemic management and cardiovascular risk reduction in type 2 diabetes.`,
    mechanismDetail: `Dulaglutide's GLP-1 analog component is a modified GLP-1(7-37) peptide with amino acid substitutions that prevent DPP-4 degradation. The two GLP-1 analogs are linked via a small peptide bridge to a modified IgG4 Fc fragment, which prevents FcγR binding (reducing immune activation) and FcRn-mediated recycling extends its half-life. This large protein structure (~63 kDa) circulates bound to albumin and is too large for renal filtration. Receptor binding and downstream signaling are identical to other GLP-1 agonists: glucose-dependent insulin secretion, glucagon suppression, gastric emptying delay, and central satiety signaling.`,
    commonProtocols: [
      {
        name: 'Diabetes Management — Standard Titration',
        description: 'The FDA-approved protocol. Most patients with T2D achieve good glycemic control at 1.5 mg. The 3.0 mg and 4.5 mg doses provide additional HbA1c lowering (~0.4% per dose step up) and additional weight loss for those who need more.',
        schedule: 'Weekly subcutaneous injection, same day each week, abdomen/thigh/upper arm',
        duration: '4-week titration steps, ongoing therapy',
        startingDose: '0.75',
        maintenanceDose: '1.5',
        unit: 'mg',
        frequency: 'weekly',
      },
      {
        name: 'Higher-Dose Glycemic and Weight Protocol',
        description: 'Escalation to 3.0 or 4.5 mg for patients needing greater HbA1c reduction or modest additional weight loss. The AWARD-11 trial validated this dose range.',
        schedule: 'Weekly subcutaneous injection, after at least 4 weeks at each prior dose level',
        duration: '12-week titration, ongoing maintenance',
        startingDose: '0.75',
        maintenanceDose: '4.5',
        unit: 'mg',
        frequency: 'weekly',
      },
    ],
    safetyNotes: [
      'Dulaglutide\'s autoinjector design hides the needle entirely, making it one of the most injection-anxiety-friendly GLP-1 options available. The device automatically retracts the needle after injection.',
      'Standard GLP-1 class warnings apply: thyroid C-cell tumor black-box warning (contraindicated in MTC or MEN 2 history), pancreatitis risk, and gallbladder disease risk.',
      'Dulaglutide should not be used in people with a prior serious hypersensitivity reaction to dulaglutide or any of its components — anaphylaxis and angioedema have been reported.',
      'If switching from another GLP-1 agonist to dulaglutide, or vice versa, the transition does not require a washout period, but dose equivalencies are approximate — start at the lowest dose and titrate based on response and tolerability.',
    ],
    stackingInfo: `Dulaglutide is rarely used in research or wellness peptide stacking contexts — it's primarily a pharmaceutical diabetes and cardiovascular risk drug. It should not be combined with other GLP-1 receptor agonists. When used in patients also taking insulin, insulin doses may need to be reduced to prevent hypoglycemia. In patients on metformin, the combination is additive for glycemic control and is a standard combination in T2D management. The autoinjector format and once-weekly schedule make it compatible with other non-GLP-1 injection protocols for patients managing multiple conditions.`,
    storageDetail: `Refrigerate at 2–8°C (36–46°F). Can be stored at room temperature (up to 30°C/86°F) for up to 14 days after removal from refrigerator. Never freeze. Store in original packaging to protect from light. Each pen is single-use — discard after use even if medicine remains. The autoinjector mechanism makes pen reuse impractical.`,
    researchStatus: `FDA-approved for type 2 diabetes (Trulicity, 2014). FDA-approved for cardiovascular risk reduction in adults with T2D and established CVD or multiple CV risk factors (2020), based on the REWIND trial. Approved dose range extended to 4.5 mg weekly based on AWARD-11 trial data (2020). Not approved for weight management, though modest weight loss is a secondary benefit. Considered an established, mature agent in the GLP-1 class.`,
    references: [
      {
        title: 'Dulaglutide and Cardiovascular Outcomes in Type 2 Diabetes (REWIND Trial)',
        source: 'The Lancet',
        year: 2019,
      },
      {
        title: 'Efficacy and Safety of Higher-Dose Dulaglutide (3 mg and 4.5 mg) in T2D — AWARD-11',
        source: 'Diabetes Care',
        year: 2021,
      },
      {
        title: 'Dulaglutide versus insulin glargine in patients with type 2 diabetes and moderate-to-severe chronic kidney disease (AWARD-7)',
        source: 'The Lancet Diabetes & Endocrinology',
        year: 2018,
      },
    ],
    faqs: [
      {
        question: 'Is dulaglutide good for weight loss?',
        answer: 'Dulaglutide produces modest weight loss — typically 2–5 kg — compared to the 10–25 kg seen with high-dose semaglutide or tirzepatide. It\'s not approved for weight management, and most prescribers would choose semaglutide or tirzepatide if weight loss is the primary goal. Dulaglutide\'s strength is in its cardiovascular outcomes data and its user-friendly autoinjector design for T2D management.',
      },
      {
        question: 'How is dulaglutide different from semaglutide if both are once-weekly?',
        answer: 'Despite the same dosing frequency, they are structurally different: semaglutide is a small modified peptide; dulaglutide is a large fusion protein (~63 kDa vs ~4 kDa). Semaglutide produces significantly more weight loss and has stronger evidence for cardiovascular protection in high-risk patients. Dulaglutide has its own cardiovascular outcomes data (REWIND) and is often preferred for its hidden-needle autoinjector. For pure efficacy on weight and glucose, semaglutide leads.',
      },
      {
        question: 'Can dulaglutide be used in chronic kidney disease?',
        answer: 'Yes — the AWARD-7 trial specifically studied dulaglutide in patients with moderate-to-severe chronic kidney disease (CKD stages 3–4) and found it effective and safe. Unlike metformin (which is contraindicated in severe CKD), GLP-1 agonists do not require dose adjustment for kidney function. Emerging data suggests GLP-1 agonists may have direct kidney-protective effects.',
      },
    ],
  },

  'retatrutide': {
    compoundId: 'retatrutide',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nRetatrutide is an investigational "triple agonist" developed by Eli Lilly — the next evolution beyond tirzepatide's dual GLP-1/GIP action, adding glucagon receptor (GCGR) agonism. Glucagon is typically associated with raising blood sugar, but in this context its receptor activation at the level of the liver and adipose tissue dramatically increases energy expenditure — it essentially forces the body to burn more calories at rest. This three-pronged approach (GLP-1 + GIP + GCGR) produced striking Phase 2 results: participants receiving 12 mg weekly lost an average of 24.2% of body weight at 48 weeks, with some individuals losing over 30%. These numbers approach or exceed the average outcomes of bariatric surgery.\n\nAs of 2024–2025, retatrutide is in Phase 3 clinical trials (the TRIUMPH program) for obesity and type 2 diabetes. It has not yet received FDA approval for any indication, making it a research compound only. Compounded versions have begun appearing, but regulatory status varies and product quality from gray-market sources is unverified. The Phase 2 data is genuinely remarkable and has positioned retatrutide as potentially the most potent anti-obesity agent ever clinically tested.\n\nThe glucagon component of retatrutide also raises some considerations not seen with dual agonists: because glucagon raises blood glucose, this must be carefully balanced against the insulin-stimulating GLP-1/GIP effects. In the Phase 2 trial, blood glucose was well-controlled despite GCGR agonism, but people with type 1 diabetes or very brittle type 2 diabetes would require careful monitoring. Liver fat reduction was also notably pronounced, making it particularly interesting for MASH (metabolic dysfunction-associated steatohepatitis).`,
    mechanismDetail: `Retatrutide is a 39-amino-acid peptide with a C20 fatty acid chain enabling weekly dosing. It activates three receptors: GLP-1R (appetite suppression, insulin secretion, gastric slowing), GIPR (additional incretin effect, adipose tissue fat mobilization), and GCGR (hepatic glucose output modulation at low doses, but more significantly, hepatic fat oxidation and thermogenesis — glucagon activates brown adipose tissue and increases metabolic rate). The net effect is a caloric deficit driven by both reduced intake (GLP-1/GIP-mediated appetite suppression) and increased expenditure (GCGR-mediated thermogenesis), which may explain the superior weight loss numbers. The GCGR activity also promotes lipolysis (fat breakdown) in a way that GLP-1/GIP alone do not, potentially leading to more fat-specific weight loss.`,
    commonProtocols: [
      {
        name: 'Phase 2 Trial Dose Escalation Protocol',
        description: 'Based on the published Phase 2 trial design. This mirrors the titration used in clinical research. Note: retatrutide is NOT FDA-approved. This protocol is for informational reference only. Use only under direct medical supervision if at all.',
        schedule: 'Weekly subcutaneous injection with gradual dose escalation',
        duration: '24-week escalation, 48-week total study period in Phase 2',
        startingDose: '2',
        maintenanceDose: '12',
        unit: 'mg',
        frequency: 'weekly',
      },
      {
        name: 'Conservative Research Protocol',
        description: 'Lower-dose approach used by some practitioners pending Phase 3 data. The 4–8 mg range still produces substantial weight loss with a potentially more manageable side effect profile.',
        schedule: 'Weekly subcutaneous injection, monthly dose reviews',
        duration: 'Ongoing, reassess every 12 weeks',
        startingDose: '2',
        maintenanceDose: '8',
        unit: 'mg',
        frequency: 'weekly',
      },
    ],
    safetyNotes: [
      'Retatrutide is NOT FDA-approved. All use outside of approved clinical trials is off-label and unvalidated. Long-term safety data beyond the Phase 2 48-week follow-up does not yet exist.',
      'The glucagon receptor agonism adds a theoretical risk of blood sugar elevation, particularly in people with insulin insufficiency. Blood glucose monitoring is advisable, especially in the early weeks.',
      'GI side effects (nausea, vomiting, diarrhea) are similar to or greater than tirzepatide given the higher potency. Phase 2 data showed ~5–10% of participants discontinued due to GI adverse events.',
      'Heart rate increase: GLP-1 and glucagon agonists both raise resting heart rate. Retatrutide showed average resting HR increases of ~5–7 bpm in Phase 2 — clinically significant in people with pre-existing arrhythmias or cardiovascular disease.',
      'Same class warnings as all GLP-1 agonists: thyroid C-cell tumors in rodents, pancreatitis risk, gallbladder disease with rapid weight loss.',
    ],
    stackingInfo: `Given its investigational status, there is no established stacking data for retatrutide. Like all GLP-1 class agents, it should not be combined with other incretin-based therapies. The triple mechanism (including thermogenesis via GCGR) suggests that caloric restriction and exercise would have additive effects, but the potency of retatrutide may make aggressive caloric restriction unnecessary — the drug itself drives a substantial caloric deficit. Lean mass protection through resistance training and protein intake remains critical. Some researchers speculate that lower-dose retatrutide (4–6 mg) combined with optimized nutrition and training may outperform higher doses without lifestyle modification, but this is theoretical.`,
    storageDetail: `No commercial formulation exists. Compounded retatrutide should be refrigerated at 2–8°C and used according to compounding pharmacy specifications (typically within 28–60 days). Protect from freezing and light. The absence of FDA-approved storage data means extra caution is warranted — inspect carefully before use and discard any cloudy or particulate-containing solution.`,
    researchStatus: `Investigational — NOT FDA-approved. Developed by Eli Lilly. Phase 2 trial published in New England Journal of Medicine (2023) showed 24.2% average weight loss at 48 weeks (12 mg dose). Phase 3 trials (TRIUMPH program) are underway for obesity and type 2 diabetes as of 2024–2025. Also being studied in MASH (fatty liver disease). Expected regulatory submission if Phase 3 is positive: potentially 2026–2027.`,
    references: [
      {
        title: 'Triple–Hormone-Receptor Agonist Retatrutide for Obesity — Phase 2 Trial',
        source: 'New England Journal of Medicine',
        year: 2023,
      },
      {
        title: 'Retatrutide, a GIP, GLP-1 and glucagon receptor agonist, for people with type 2 diabetes: a randomised, double-blind, placebo and active-controlled, parallel-group, phase 2 trial',
        source: 'The Lancet',
        year: 2023,
      },
    ],
    faqs: [
      {
        question: 'How is retatrutide different from tirzepatide?',
        answer: 'Tirzepatide activates two receptors (GLP-1 + GIP); retatrutide activates three (GLP-1 + GIP + glucagon). The glucagon receptor addition appears to drive energy expenditure (calorie burning) rather than just reducing calorie intake, which explains why retatrutide produces even greater weight loss. In Phase 2, retatrutide at 12 mg produced ~24% weight loss vs ~20% for tirzepatide at 15 mg.',
      },
      {
        question: 'When will retatrutide be available by prescription?',
        answer: 'Phase 3 trials began in 2023–2024. If successful, a regulatory submission could occur in 2026, with potential FDA approval in 2026–2027. No approval timeline is guaranteed. Compounded versions are appearing before approval, but these carry significant quality and safety uncertainties.',
      },
      {
        question: 'Does the glucagon component cause blood sugar to spike?',
        answer: 'In clinical trials, it did not — the GLP-1 and GIP insulin-stimulating effects appeared to counterbalance the glucagon\'s glucose-raising effect. Overall glycemic control was good or improved. However, in individuals with very limited insulin secretory capacity (late-stage T2D, LADA, or T1D), the balance could shift unfavorably, making this a more complex agent in those populations.',
      },
    ],
  },

  'exenatide': {
    compoundId: 'exenatide',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nExenatide was the first GLP-1 receptor agonist approved by the FDA (2005), making it the grandfather of the entire drug class. It is derived from exendin-4, a peptide found in the saliva of the Gila monster lizard that happens to bind human GLP-1 receptors with high affinity. Unlike human GLP-1, exendin-4 is not rapidly degraded by the DPP-4 enzyme, giving it a longer duration of action. Two formulations exist: Byetta (twice-daily injection) and Bydureon BCise (once-weekly extended-release microspheres).\n\nExenatide demonstrated the proof of concept for the entire GLP-1 drug class — that targeting this receptor could meaningfully improve blood sugar and cause significant weight loss (typically 2–4 kg in trials). While its efficacy for weight loss is modest compared to newer agents like semaglutide and tirzepatide, it established the clinical foundation for the class. The EXSCEL cardiovascular outcomes trial (2017) showed exenatide was non-inferior to placebo for CV events, meaning it was safe from a cardiovascular standpoint but did not demonstrate the protective benefit seen with newer agents.\n\nToday, exenatide is primarily used in patients who have been stable on it for years or in settings where newer agents are cost-prohibitive or unavailable. The twice-daily Byetta formulation has been discontinued in some markets, with the once-weekly Bydureon being preferred. Exenatide is significantly cheaper than semaglutide and tirzepatide in many regions and remains on formulary where newer agents are not covered.`,
    mechanismDetail: `Exenatide is a 39-amino-acid peptide with 53% homology to human GLP-1. Its structural differences — particularly amino acid substitutions that prevent DPP-4 cleavage — explain its longer action compared to native GLP-1. Immediate-release exenatide (Byetta) has a half-life of ~2.4 hours, requiring twice-daily dosing. Extended-release exenatide (Bydureon) is encapsulated in poly(D,L-lactide-co-glycolide) (PLGA) microspheres that slowly erode, releasing exenatide continuously over ~10 weeks, with steady-state plasma levels providing once-weekly dosing convenience. Mechanistically, it activates GLP-1 receptors identically to endogenous GLP-1 and other GLP-1 analogs: glucose-dependent insulin secretion, glucagon suppression, gastric emptying delay, and central satiety signaling.`,
    commonProtocols: [
      {
        name: 'Bydureon BCise Once-Weekly Protocol',
        description: 'The preferred current exenatide protocol. Steady-state is reached after ~6–7 weeks of weekly dosing. There is no titration — the single dose is 2 mg weekly. This avoids the twice-daily injection burden of Byetta.',
        schedule: 'Weekly subcutaneous injection (autoinjector device), same day each week',
        duration: 'Ongoing, typically indefinite for T2D management',
        startingDose: '2',
        maintenanceDose: '2',
        unit: 'mg',
        frequency: 'weekly',
      },
      {
        name: 'Byetta Twice-Daily Protocol (Legacy)',
        description: 'The original exenatide formulation, still used in some settings. Injected within 60 minutes before the two largest meals of the day. The pre-meal timing is important for optimal glucose control.',
        schedule: 'Subcutaneous injection twice daily, 60 minutes before morning and evening meals',
        duration: 'Ongoing for T2D management',
        startingDose: '5',
        maintenanceDose: '10',
        unit: 'mcg',
        frequency: 'daily',
      },
    ],
    safetyNotes: [
      'Acute kidney injury has been reported with exenatide, particularly in patients who become dehydrated due to nausea and vomiting. Maintain adequate hydration and seek medical attention if urination decreases significantly.',
      'Injection-site nodules are common with Bydureon (the extended-release microsphere formulation) — these are usually benign but should be monitored. Do not inject into existing nodules.',
      'Standard GLP-1 class warnings apply: thyroid C-cell tumor black-box warning (contraindicated in MTC or MEN 2), pancreatitis risk.',
      'Exenatide is contraindicated in severe kidney disease (eGFR <30 mL/min/1.73m²) — unlike semaglutide and dulaglutide, which can be used with dose caution in CKD. This is a meaningful difference if kidney function is impaired.',
    ],
    stackingInfo: `Exenatide should not be combined with other GLP-1 agonists. As the oldest and least potent approved GLP-1 agent, it is rarely used in modern peptide optimization protocols. When used in diabetes management, it is commonly combined with metformin and/or SGLT-2 inhibitors. For patients transitioning from exenatide to a newer agent (semaglutide or tirzepatide), the switch can typically be made immediately without washout — start the new agent on the next scheduled injection day. In research contexts, exenatide has been studied as an intracranial infusion for Parkinson's disease and Alzheimer's disease in small trials, representing an entirely different application than metabolic use.`,
    storageDetail: `Bydureon BCise: refrigerate at 2–8°C. Single-use autoinjector — can be stored at room temperature (below 30°C/86°F) for up to 4 weeks. Shake the autoinjector vigorously for 15 seconds before use to resuspend the microspheres. Byetta pens: after first use, store below 25°C (77°F) for up to 30 days. Do not freeze either formulation.`,
    researchStatus: `FDA-approved for type 2 diabetes as Byetta (twice-daily, 2005) and Bydureon/Bydureon BCise (once-weekly, 2012). EXSCEL trial (2017) established cardiovascular non-inferiority. No FDA approval for weight management — weight loss is a secondary effect. Considered a mature, older-generation GLP-1 agonist. Active research niche: neurological applications (small trials in Parkinson's disease and Alzheimer's using intranasal or intrathecal delivery).`,
    references: [
      {
        title: 'Lixisenatide in Patients with Type 2 Diabetes and Acute Coronary Syndrome (ELIXA) — context: first CV outcomes GLP-1 trial',
        source: 'New England Journal of Medicine',
        year: 2015,
      },
      {
        title: 'Exenatide once weekly versus twice daily for the treatment of type 2 diabetes (DURATION-1)',
        source: 'The Lancet',
        year: 2008,
      },
      {
        title: 'Exenatide and Cardiovascular Outcomes in Type 2 Diabetes (EXSCEL)',
        source: 'New England Journal of Medicine',
        year: 2017,
      },
    ],
    faqs: [
      {
        question: 'Is exenatide still worth using given newer options exist?',
        answer: 'For patients who are well-controlled on it and tolerating it well, switching is not always necessary. For patients starting a GLP-1 agonist fresh, or for those seeking maximum weight loss, semaglutide or tirzepatide are almost universally preferred today. Exenatide\'s main advantages are cost (often generic pricing in some markets), familiarity, and availability when newer agents are out of stock.',
      },
      {
        question: 'Why is exenatide derived from a lizard?',
        answer: 'The Gila monster (Heloderma suspectum) produces exendin-4 in its saliva, likely as part of a venom-related system. In the 1990s, researcher John Eng at the VA Medical Center discovered that exendin-4 could bind and activate the human GLP-1 receptor. Since the lizard peptide is not degraded by human DPP-4 enzymes (its amino acid sequence naturally resists the enzyme), it served as a template for developing longer-acting GLP-1 drugs.',
      },
      {
        question: 'Can exenatide be used in patients with kidney disease?',
        answer: 'Byetta (immediate-release) and Bydureon are contraindicated in severe CKD (eGFR <30) and not recommended in moderate CKD (eGFR 30–59). This is a meaningful limitation compared to semaglutide and dulaglutide, which have demonstrated safety and even kidney-protective effects in CKD. If a patient has CKD and needs a GLP-1 agonist, newer agents are typically preferred.',
      },
    ],
  },

'sermorelin': {
    compoundId: 'sermorelin',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nSermorelin is a synthetic version of Growth Hormone-Releasing Hormone (GHRH), specifically the first 29 amino acids (the biologically active portion). When injected, it travels to the pituitary gland and stimulates it to produce and release the body's own growth hormone (GH) — it does not introduce exogenous GH directly. This is a critical distinction: because sermorelin works through your own pituitary, the GH release it triggers remains subject to normal physiological feedback loops, reducing the risk of supraphysiological GH levels and the side effects that come with direct GH injections.\n\nSermorelin was FDA-approved as Geref for diagnosing GH deficiency in children (1990) and for treating GH deficiency in HIV-associated wasting. While that specific product has been discontinued, sermorelin remains widely compounded and used in anti-aging and performance medicine for adults experiencing age-related GH decline (somatopause). Common reported benefits include improved sleep quality (particularly deep slow-wave sleep), modest lean mass improvements, fat loss, skin changes, and recovery enhancement — most of these benefits are mediated by the increase in GH and downstream IGF-1.`,
    mechanismDetail: `Sermorelin binds to Growth Hormone-Releasing Hormone Receptor (GHRHR) on pituitary somatotroph cells, activating the cAMP pathway and triggering GH synthesis and secretion. The physiological feedback system remains intact: rising GH levels trigger somatostatin release, which then suppresses further GH secretion — this prevents runaway GH elevation. Because GH is released in pulses (predominantly during deep sleep), sermorelin is most effective when injected at bedtime to align with the natural GH pulse. Downstream, GH stimulates IGF-1 production in the liver, and IGF-1 mediates many of GH's anabolic and metabolic effects. Sermorelin's half-life is very short (~10–20 minutes), so it acts as a brief pulse stimulus.`,
    commonProtocols: [
      {
        name: 'Standard Anti-Aging/Wellness Protocol',
        description: 'The most common compounded sermorelin protocol. Injected subcutaneously at bedtime to synergize with the natural nighttime GH pulse. Responses are gradual — expect 3–6 months before peak benefits. IGF-1 blood levels are used to track response.',
        schedule: 'Daily subcutaneous injection at bedtime, 5 days on / 2 days off weekly',
        duration: '6-month cycles, then reassess with IGF-1 testing',
        startingDose: '200',
        maintenanceDose: '300',
        unit: 'mcg',
        frequency: 'daily',
      },
      {
        name: 'Sermorelin + Ipamorelin Combination',
        description: 'Pairing sermorelin (GHRH analog) with ipamorelin (a GHRP) creates a synergistic GH pulse — the two pathways work together to produce greater GH release than either alone. This is the most common dual-peptide protocol in anti-aging medicine.',
        schedule: 'Subcutaneous injection at bedtime, 5 days on / 2 days off',
        duration: '6-month cycles',
        startingDose: '200',
        maintenanceDose: '300',
        unit: 'mcg',
        frequency: 'daily',
      },
    ],
    safetyNotes: [
      'Sermorelin works through the pituitary, so it requires a functional pituitary gland. It will not work in patients with pituitary damage, tumors, or hypopituitarism — a condition that requires direct GH replacement instead.',
      'Common injection-site reactions include redness, swelling, and brief discomfort — these typically resolve within minutes to hours. Using a small (29–31 gauge) needle minimizes this.',
      'IGF-1 monitoring is recommended to ensure levels remain within the normal physiological range (typically 150–300 ng/mL for adults). Chronically supraphysiological IGF-1 is associated with increased cancer risk over the long term.',
    ],
    stackingInfo: `Sermorelin is most commonly stacked with a growth hormone releasing peptide (GHRP) — ipamorelin is the preferred partner because it causes minimal cortisol or prolactin elevation. CJC-1295 (no DAC / Mod GRF 1-29) is the longer-acting GHRH alternative often used instead of sermorelin in combination protocols. Sermorelin is generally not stacked with exogenous GH (redundant and blunts the pituitary stimulus). It is often used alongside testosterone optimization and other recovery peptides in comprehensive anti-aging protocols.`,
    storageDetail: `Lyophilized (freeze-dried) powder: store at room temperature or refrigerated, protected from light. Reconstituted with bacteriostatic water: refrigerate at 2–8°C, use within 30 days. Do not freeze reconstituted solution. Protect from light; some practitioners store in opaque vials or covered syringes.`,
    researchStatus: `Previously FDA-approved (Geref) for GH deficiency diagnosis and HIV wasting; original product discontinued. Widely used as compounded peptide. Off-label use in adult somatopause is not FDA-approved. Limited modern randomized controlled trial data in healthy adults, though older studies support pituitary GH stimulation. Used in clinical practice by anti-aging and functional medicine physicians.`,
    references: [
      {
        title: 'Growth hormone-releasing hormone: clinical studies and therapeutic aspects',
        source: 'Endocrine Reviews',
        year: 1991,
      },
      {
        title: 'Sermorelin: a better approach to management of adult-onset growth hormone insufficiency?',
        source: 'Clinical Interventions in Aging',
        year: 2006,
      },
    ],
    faqs: [
      {
        question: 'Is sermorelin safer than injecting growth hormone directly?',
        answer: 'The argument is yes — because sermorelin stimulates your own pituitary rather than delivering GH directly, your body\'s feedback mechanisms remain active and prevent GH levels from going outside physiological range. Direct GH injections bypass this feedback entirely. However, sermorelin is also less potent and predictable than direct GH, and long-term safety data in healthy adults is limited.',
      },
      {
        question: 'How long does it take to see results from sermorelin?',
        answer: 'Improved sleep quality is often reported within the first 2–4 weeks. Body composition changes (modest fat loss, slight lean mass increase) and skin/recovery benefits typically take 3–6 months to become apparent. IGF-1 levels generally rise within 4–8 weeks and can be used as an objective marker of response.',
      },
    ],
  },

  'tesamorelin': {
    compoundId: 'tesamorelin',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nTesamorelin is a synthetic GHRH analog — a 44-amino-acid peptide that mimics the full human GHRH sequence, unlike sermorelin which only uses the first 29 amino acids. It is FDA-approved (brand name Egrifta) specifically for reducing excess abdominal fat (visceral adiposity) in HIV-infected adults with lipodystrophy, a condition where antiretroviral drugs cause fat to redistribute abnormally. In this approved use, tesamorelin at 2 mg daily produced significant reductions in visceral adipose tissue (VAT) — on average 15–18% reduction measured by CT scan — in clinical trials.\n\nTesamorelin has attracted interest in the research community because visceral fat reduction is one of the most medically meaningful body composition improvements achievable. Visceral fat (the fat around internal organs) is strongly linked to cardiovascular disease, insulin resistance, and inflammation. Tesamorelin's ability to selectively reduce VAT with relatively modest changes in subcutaneous fat distinguishes it from simple caloric restriction, which reduces both compartments proportionally. Research in non-HIV populations (including age-related visceral adiposity and cognitive function) is ongoing.`,
    mechanismDetail: `Tesamorelin contains the complete 44-amino-acid human GHRH sequence with a trans-3-hexenoic acid group on the N-terminus, which protects it from endopeptidase cleavage and extends its half-life to approximately 26 minutes (still short, requiring daily injection). It binds GHRHR on pituitary somatotrophs and stimulates GH release, which subsequently raises IGF-1. The selective visceral fat reduction likely occurs because visceral fat cells express more GH receptors and GH-stimulated lipolysis than subcutaneous fat cells. Normal physiological feedback is maintained, preventing supraphysiological GH levels.`,
    commonProtocols: [
      {
        name: 'Standard Visceral Fat Reduction Protocol',
        description: 'Based on the FDA-approved dose for HIV lipodystrophy but used off-label for visceral adiposity. Daily injection at bedtime leverages the natural GH pulse. Waist circumference and ideally CT or MRI measurement track response. Full effects take 3–6 months.',
        schedule: 'Daily subcutaneous injection into abdomen at bedtime',
        duration: '26-week minimum; some protocols continue 52 weeks',
        startingDose: '1',
        maintenanceDose: '2',
        unit: 'mg',
        frequency: 'daily',
      },
    ],
    safetyNotes: [
      'Fluid retention (edema) and joint pain (arthralgia) are the most common side effects, occurring in roughly 10–15% of users. These are GH-class effects and often resolve with dose reduction.',
      'Because tesamorelin raises IGF-1, it should be used cautiously or avoided in individuals with active malignancies or a strong family history of cancer — GH and IGF-1 can theoretically stimulate tumor growth.',
      'Injection-site reactions are common; rotating sites within the abdomen helps reduce accumulation of local irritation.',
    ],
    stackingInfo: `Tesamorelin is often used as a standalone compound for VAT reduction. It can be combined with ipamorelin for additional GH pulse amplitude, similar to sermorelin-based protocols. Stacking with GLP-1 agonists (semaglutide, tirzepatide) for combined visceral fat and overall weight reduction is being explored, but clinical data is limited. Avoid stacking with exogenous GH.`,
    storageDetail: `Lyophilized vials: store below 25°C (77°F), protected from light. After reconstitution with sterile water (not bacteriostatic water — Egrifta comes with specific diluent): use within 3 hours at room temperature or 24 hours refrigerated. Compounded tesamorelin: follow compounding pharmacy instructions, typically refrigerate and use within 14–28 days after reconstitution.`,
    researchStatus: `FDA-approved for HIV-associated lipodystrophy (Egrifta, 2010; Egrifta SV — new formulation — 2019). Not FDA-approved for general visceral adiposity or anti-aging use. Active research: cognitive function in older adults (several trials showing improved cognition and reduced brain amyloid), non-HIV visceral adiposity.`,
    references: [
      {
        title: 'Tesamorelin reduces liver fat and insulin resistance in HIV-infected patients with abdominal fat accumulation',
        source: 'AIDS',
        year: 2014,
      },
      {
        title: 'Reduction in visceral adiposity is associated with an improved metabolic profile in HIV-infected patients receiving tesamorelin',
        source: 'Clinical Infectious Diseases',
        year: 2012,
      },
    ],
    faqs: [
      {
        question: 'Does tesamorelin work for visceral fat in people without HIV?',
        answer: 'Small studies in non-HIV populations suggest yes — tesamorelin reduces visceral fat through the same GH-mediated mechanism regardless of HIV status. However, the FDA approval is specifically for HIV lipodystrophy, so any use in the general population is off-label and lacks the robust clinical trial backing of the approved indication.',
      },
    ],
  },

  'cjc-1295-with-dac': {
    compoundId: 'cjc-1295-with-dac',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nCJC-1295 with DAC (Drug Affinity Complex) is a modified GHRH analog engineered for extremely long action. The "DAC" component is a lysine-maleimido-propionic acid group that covalently binds to albumin in the bloodstream — the same protein that carries fatty acids and keeps many drugs circulating. This albumin binding dramatically extends CJC-1295's half-life from minutes (like sermorelin) to approximately 6–8 days, allowing once or twice-weekly injections.\n\nThe long half-life creates a continuous, elevated baseline of GH stimulation rather than the sharp pulses produced by shorter-acting GHRH peptides. This "GH bleed" effect raises IGF-1 levels substantially and maintains them elevated throughout the week. Some practitioners view this as an advantage for sustained anabolic and recovery effects; others prefer the more physiological pulse pattern of shorter-acting GHRH analogs. CJC-1295 with DAC is not FDA-approved and exists only as a research/compounded peptide.`,
    mechanismDetail: `CJC-1295 is a tetrasubstituted GHRH(1-29) analog with four amino acid substitutions that prevent enzymatic degradation. The DAC component forms a stable amide bond with the epsilon-amino group of lysine at position 40 of albumin — this is the same albumin-binding mechanism used commercially in fatty acid-conjugated drugs like semaglutide and insulin detemir. The result is a molecule that circulates for days, providing continuous GHRHR stimulation. Unlike sermorelin and CJC-1295 without DAC, the prolonged stimulation can desensitize the pituitary GHRHR over time, which is why some protocols include periodic breaks.`,
    commonProtocols: [
      {
        name: 'Standard Once-Weekly Protocol',
        description: 'Low-frequency dosing exploiting the long half-life. Typically combined with a GHRP (ipamorelin) for synergistic GH pulse amplification. IGF-1 monitoring at weeks 4 and 12 recommended.',
        schedule: 'Once weekly subcutaneous injection, preferably at bedtime',
        duration: '12-week cycles with 4-week break',
        startingDose: '1000',
        maintenanceDose: '2000',
        unit: 'mcg',
        frequency: 'weekly',
      },
      {
        name: 'Twice-Weekly Protocol',
        description: 'More commonly used dose schedule for consistent IGF-1 elevation. The DAC provides continuous coverage between injections.',
        schedule: 'Twice-weekly subcutaneous injection at bedtime',
        duration: '8–12 week cycles',
        startingDose: '500',
        maintenanceDose: '1000',
        unit: 'mcg',
        frequency: '2xWeek',
      },
    ],
    safetyNotes: [
      'The continuous GH stimulation from DAC may cause more pronounced water retention, joint stiffness, and carpal tunnel-like symptoms compared to pulse-based GHRH protocols — especially at higher doses.',
      'Pituitary receptor desensitization is a theoretical concern with long-acting GHRH stimulation. Cycling (e.g., 12 weeks on, 4 weeks off) is commonly recommended to mitigate this.',
      'IGF-1 monitoring is important — the long-acting nature means IGF-1 can accumulate to supraphysiological levels without the user being aware. Regular blood testing is recommended.',
    ],
    stackingInfo: `Most commonly stacked with ipamorelin (GHRP) for synergistic GH release. Some users prefer CJC-1295 without DAC + ipamorelin for a more natural pulse pattern and less receptor desensitization risk. Can be combined with peptides like BPC-157 and TB-500 for injury recovery protocols. Should not be combined with exogenous GH or sermorelin (redundant GHRH stimulation).`,
    storageDetail: `Lyophilized powder: refrigerate or store at room temperature protected from light. Reconstituted solution: refrigerate at 2–8°C, use within 30 days. Do not freeze reconstituted solution. Some practitioners store in 27–30 gauge insulin syringes pre-drawn in a refrigerator for up to 2 weeks.`,
    researchStatus: `Not FDA-approved. Research compound only. Published Phase 1/2 human studies exist (Teichman et al., JCEM 2006) confirming pharmacokinetics and GH/IGF-1 elevation in healthy adults. No large randomized controlled trials in disease states. Widely used in compounding medicine for anti-aging and body composition.`,
    references: [
      {
        title: 'Prolonged stimulation of growth hormone (GH) and insulin-like growth factor I secretion by CJC-1295, a long-acting analog of GH-releasing hormone, in healthy adults',
        source: 'Journal of Clinical Endocrinology & Metabolism',
        year: 2006,
      },
    ],
    faqs: [
      {
        question: 'CJC-1295 with DAC versus without DAC — which is better?',
        answer: 'With DAC: convenient weekly dosing, sustained IGF-1 elevation, more pronounced "GH bleed" effect. Without DAC (Mod GRF 1-29): physiological pulse pattern, less receptor desensitization risk, injected daily or paired with a GHRP at the same time. Most practitioners prefer the without-DAC version for its more natural rhythm, while the with-DAC version suits people who want minimal injection frequency and sustained IGF-1 elevation.',
      },
      {
        question: 'Why is this called CJC-1295 if there were other CJC compounds?',
        answer: 'The CJC designation (ConjuChem Joint Compound) came from ConjuChem Biotechnologies, a Canadian company that developed a series of peptide conjugates. CJC-1295 was their 1295th compound in the series. The DAC technology was their proprietary albumin-binding platform applied to GHRH analog development.',
      },
    ],
  },

  'cjc-1295-no-dac--mod-grf-1-29': {
    compoundId: 'cjc-1295-no-dac--mod-grf-1-29',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nCJC-1295 without DAC (also called Modified GRF 1-29 or Mod GRF 1-29) is a stabilized GHRH(1-29) analog — essentially a more stable version of sermorelin. Like sermorelin, it contains the first 29 amino acids of GHRH, but with four amino acid substitutions that protect it from enzymatic degradation and give it a longer half-life than sermorelin (~30 minutes vs ~10 minutes). Without the DAC albumin-binding group, it does not have the week-long half-life of CJC-1295 with DAC — instead, it produces a defined GH pulse when injected, then clears within an hour.\n\nThis pulsatile pattern is considered by many practitioners to be more physiologically appropriate than the continuous GH stimulation from the DAC version, as it mimics the body's natural pattern of GH release. It is almost always paired with a GHRP (growth hormone releasing peptide) such as ipamorelin — injecting both simultaneously produces a synergistic GH pulse that is substantially larger than either peptide alone. This combination has become the most commonly used GHRH/GHRP protocol in compounding medicine.`,
    mechanismDetail: `Mod GRF 1-29 binds GHRHR with greater affinity and stability than sermorelin due to its four substitutions: Ala2 to D-Ala (DPP-4 resistance), Gln8 to Ala (protease resistance), Ala15 to Ala (stability), and Leu27 to Leu (stability). When injected, it causes a sharp, physiological GH pulse peaking at approximately 15–30 minutes and returning to baseline within 1–2 hours. Pairing with a GHRP exploits two different GH-stimulating pathways simultaneously — GHRH receptor activation plus ghrelin receptor (GHS-R) activation — producing 2–10x the GH pulse of either alone.`,
    commonProtocols: [
      {
        name: 'Mod GRF 1-29 + Ipamorelin Combination (Standard)',
        description: 'The most widely used combination protocol. Both peptides are drawn into the same syringe and injected simultaneously at bedtime to amplify the natural overnight GH pulse. This is the foundation of most GHRH/GHRP protocols.',
        schedule: 'Nightly subcutaneous injection, 5 days on / 2 days off',
        duration: '3–6 month cycles',
        startingDose: '100',
        maintenanceDose: '200',
        unit: 'mcg',
        frequency: 'daily',
      },
      {
        name: 'Multiple Daily Pulse Protocol',
        description: 'Advanced protocol injecting Mod GRF 1-29 + ipamorelin 2–3 times daily (bedtime + post-workout + morning) to increase total GH stimulation. Requires more frequent injections but may accelerate results.',
        schedule: '2–3 injections daily: upon waking (fasted), post-workout, and bedtime',
        duration: '8-week cycles with 4-week break',
        startingDose: '100',
        maintenanceDose: '200',
        unit: 'mcg',
        frequency: 'daily',
      },
    ],
    safetyNotes: [
      'Must be injected in a fasted state (at least 1–2 hours after eating, or 30 minutes before eating) for maximum effectiveness — eating raises insulin and somatostatin, which blunt GH release.',
      'The short half-life means side effects, if any, resolve quickly. Flushing, mild nausea, and tingling in the extremities are occasionally reported immediately post-injection and typically subside within 30 minutes.',
      'As with all GH-axis peptides, IGF-1 monitoring every 3–6 months is advisable to ensure levels remain in the physiological range.',
    ],
    stackingInfo: `Mod GRF 1-29 is almost always stacked with ipamorelin — this is the defining combination protocol. Some users add MK-677 (ibutamoren, oral) as a daytime GH secretagogue to complement the nightly Mod GRF 1-29 + ipamorelin injection. BPC-157 and TB-500 are commonly added to recovery-focused protocols. The combination with exogenous GH is redundant and not recommended.`,
    storageDetail: `Lyophilized powder: stable at room temperature for short periods but best refrigerated at 2–8°C. Reconstituted with bacteriostatic water: refrigerate, use within 30 days. Many users pre-mix Mod GRF 1-29 and ipamorelin in the same vial or draw into the same syringe immediately before injection — this is generally stable as no incompatibility between the two peptides is documented.`,
    researchStatus: `Not FDA-approved. Research compound. Derived from the GHRH(1-29) fragment with modifications for stability. No large-scale clinical trials. Extensively used in compounding and anti-aging medicine. The underlying GHRH biology is well-established; the specific Mod GRF 1-29 molecule has limited independent RCT evidence.`,
    references: [
      {
        title: 'Growth Hormone-Releasing Hormone Analogues: From Basic Research to Clinical Application',
        source: 'Endocrine Reviews',
        year: 2018,
      },
    ],
    faqs: [
      {
        question: 'Is Mod GRF 1-29 the same as sermorelin?',
        answer: 'Both are GHRH(1-29) fragments — the same 29-amino-acid sequence — but Mod GRF 1-29 has four amino acid substitutions that make it more stable and potent. Think of sermorelin as the original version and Mod GRF 1-29 as the improved formulation. They work the same way but Mod GRF 1-29 produces a larger, more consistent GH pulse.',
      },
    ],
  },

  'ipamorelin': {
    compoundId: 'ipamorelin',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nIpamorelin is a selective growth hormone secretagogue — a synthetic pentapeptide (5 amino acids) that mimics ghrelin (the "hunger hormone") at the ghrelin receptor (GHS-R1a) on the pituitary gland, stimulating GH release. What makes ipamorelin stand out in its class is its selectivity: unlike older GHRPs such as GHRP-2 and GHRP-6, ipamorelin does not significantly stimulate cortisol, prolactin, or ACTH release at standard doses. This makes it the cleanest GHRP available — you get the GH pulse without the undesirable hormonal side effects.\n\nIpamorelin is almost universally used in combination with a GHRH analog (most commonly Mod GRF 1-29 or CJC-1295 without DAC). The two classes of peptides stimulate GH release through different receptors and have a strongly synergistic effect when combined — the combined GH pulse can be 2–10 times larger than either peptide alone. Standard dosing is 100–300 mcg per injection, typically at bedtime and/or post-workout. Benefits reported include improved sleep quality, recovery from training, modest lean mass increases, and fat loss — all mediated by the increase in GH and IGF-1.`,
    mechanismDetail: `Ipamorelin is a Ala-His-D-2Nal-D-Phe-Lys-NH2 pentapeptide that selectively binds the GHS-R1a (ghrelin receptor) on pituitary somatotrophs and hypothalamic neurons. GHS-R1a activation triggers intracellular calcium release via Gq/phospholipase C pathway, stimulating GH secretion. The key selectivity feature is that at therapeutic doses, ipamorelin does not activate adrenal ACTH/cortisol or pituitary prolactin pathways — a problem with older GHRPs. Ipamorelin has a half-life of approximately 2 hours, producing a clean GH pulse that follows the injected bolus.`,
    commonProtocols: [
      {
        name: 'Ipamorelin + Mod GRF 1-29 (Standard Bedtime)',
        description: 'The foundational combination protocol. Both peptides injected together at bedtime, in a fasted state. Targets the natural overnight GH pulse window for maximum effect.',
        schedule: 'Nightly subcutaneous injection, fasted (2+ hours after last meal)',
        duration: '3–6 month cycles, 4–8 week breaks',
        startingDose: '100',
        maintenanceDose: '200',
        unit: 'mcg',
        frequency: 'daily',
      },
      {
        name: 'Multiple Daily Pulse Protocol',
        description: 'Three times daily injections to maximize total daily GH stimulation. Best suited for people focused on body composition optimization or accelerated recovery from injury.',
        schedule: 'Morning fasted, post-workout, and bedtime subcutaneous injections',
        duration: '8–12 week cycles',
        startingDose: '100',
        maintenanceDose: '200',
        unit: 'mcg',
        frequency: 'daily',
      },
    ],
    safetyNotes: [
      'Inject in a fasted state for best results — food intake raises insulin, which increases somatostatin and suppresses the GH pulse. Wait at least 1–2 hours after eating and 30 minutes before eating to inject.',
      'Headache and mild flushing are the most commonly reported acute side effects, typically lasting 10–30 minutes post-injection. These often diminish with repeated use as the body adapts.',
      'Because ipamorelin works through the ghrelin receptor, it can transiently increase appetite in some users — especially at higher doses. Plan accordingly if hunger management is a priority.',
    ],
    stackingInfo: `Ipamorelin's ideal partner is a GHRH analog (Mod GRF 1-29 or sermorelin). Beyond that, it is frequently added to recovery stacks with BPC-157 and TB-500. In comprehensive anti-aging protocols it may be used alongside sermorelin, testosterone optimization, and thyroid support. MK-677 is sometimes used as an oral alternative or addition; however, combining ipamorelin with MK-677 provides overlapping mechanisms and may be excessive for most users.`,
    storageDetail: `Lyophilized powder: refrigerate at 2–8°C or store at room temperature short-term. Reconstituted with bacteriostatic water: refrigerate, stable for 30 days. Pre-mixing with Mod GRF 1-29 in the same vial is commonly practiced with no documented stability issues.`,
    researchStatus: `Not FDA-approved. Research compound. Developed by Novo Nordisk in the 1990s; discovered to be the most selective of the GHRP class. Used extensively in compounding medicine. Limited independent RCT data in humans; mechanism well-characterized in published research.`,
    references: [
      {
        title: 'Ipamorelin, the first selective growth hormone secretagogue',
        source: 'European Journal of Endocrinology',
        year: 1998,
      },
    ],
    faqs: [
      {
        question: 'Why is ipamorelin preferred over older GHRPs like GHRP-2 and GHRP-6?',
        answer: 'GHRP-2 and GHRP-6 stimulate cortisol, prolactin, and ACTH alongside GH — these hormonal side effects are undesirable for long-term use. GHRP-6 also causes intense hunger in most users. Ipamorelin selectively stimulates GH without meaningful cortisol or prolactin elevation at standard doses, making it safer and more comfortable for ongoing use.',
      },
    ],
  },

  'mk-677-ibutamoren': {
    compoundId: 'mk-677-ibutamoren',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nMK-677 (ibutamoren) is a non-peptide, orally active GH secretagogue that mimics ghrelin and activates the GHS-R1a receptor, stimulating pituitary GH release and raising IGF-1. It is taken orally — making it unique among GH secretagogues, all of which otherwise require injection. The half-life of 24 hours allows once-daily dosing. MK-677 is not FDA-approved for any indication and remains a research compound, though it is one of the most widely used compounds in the performance and anti-aging community due to its oral convenience.\n\nKey clinical effects include: significant IGF-1 elevation (30–90% above baseline in studies), improved sleep quality (particularly slow-wave deep sleep), increased appetite, and modest body composition improvements. The appetite increase is a major practical consideration — it can help individuals who struggle to eat enough to gain muscle, but it is counterproductive for those using it during a weight-loss phase. MK-677 has been studied for muscle wasting, osteoporosis, and GH deficiency in published trials; a 2-year study in elderly adults (Nuttall et al., JCEM 2008) showed sustained IGF-1 elevation without tachyphylaxis (loss of effect over time).`,
    mechanismDetail: `MK-677 is a spiroindoline non-peptide compound that binds the GHS-R1a receptor with high affinity. Unlike peptide GHRPs, it is orally bioavailable (~5–7% in humans, sufficient for pharmacological effect) and has a ~24-hour half-life. Activation of GHS-R1a in the pituitary triggers GH secretion; hypothalamic GHS-R1a activation amplifies the GH pulse further and appears to mediate the slow-wave sleep enhancement. Downstream IGF-1 production is the primary mediator of body composition effects. MK-677 does not suppress the hypothalamic-pituitary axis when used within physiological ranges because endogenous feedback (somatostatin, IGF-1) remains intact.`,
    commonProtocols: [
      {
        name: 'Standard Once-Daily Protocol',
        description: 'Most common protocol. Taken at bedtime to leverage the natural overnight GH pulse and minimize the appetite-stimulating effects during waking hours. Start at 10 mg to assess tolerance, then increase to 25 mg.',
        schedule: 'Oral, once daily at bedtime',
        duration: '3–6 month cycles, 4–8 week breaks',
        startingDose: '10',
        maintenanceDose: '25',
        unit: 'mg',
        frequency: 'daily',
      },
      {
        name: 'Lower Dose Anti-Aging/Sleep Protocol',
        description: 'Lower doses (10–12.5 mg) emphasize the sleep quality and mild IGF-1 elevation benefits while minimizing water retention and appetite stimulation. Suitable for long-term use.',
        schedule: 'Oral, once nightly',
        duration: 'Long-term (12+ months), reassess quarterly with IGF-1 testing',
        startingDose: '5',
        maintenanceDose: '12.5',
        unit: 'mg',
        frequency: 'daily',
      },
    ],
    safetyNotes: [
      'Water retention (edema) is one of the most common side effects, particularly in the first 2–4 weeks. Reducing sodium intake and ensuring adequate hydration helps. In some users, ankles and hands swell noticeably.',
      'Increased appetite is nearly universal. Users focused on fat loss should be aware that MK-677 may work against their goals if caloric discipline is compromised. Some manage this by using lower doses (10 mg) or only using it during bulking phases.',
      'Transient increases in blood glucose and insulin levels have been observed, particularly at higher doses. People with prediabetes, insulin resistance, or metabolic syndrome should monitor fasting glucose and use with caution.',
      'MK-677 is not a steroid and does not suppress testosterone; it acts purely on the GH axis. However, the oral formulation means it goes through first-pass liver metabolism — this is generally well-tolerated but makes hepatic monitoring appropriate for long-term use.',
    ],
    stackingInfo: `MK-677 pairs naturally with injection-based GHRH/GHRP protocols — it can serve as a daytime GH secretagogue complement to nightly Mod GRF 1-29 + ipamorelin injections, though the overlap may be unnecessary for most users. It is frequently combined with SARMs in body composition protocols (research context only). For muscle preservation on GLP-1 agonist therapy (semaglutide/tirzepatide), MK-677 is sometimes added to counteract lean mass loss — though the appetite-stimulating effects directly conflict with GLP-1-mediated appetite suppression, making this combination pharmacologically paradoxical. Best used standalone for its sleep and IGF-1 benefits, or in a bulk-phase with creatine and high-protein diet.`,
    storageDetail: `Oral capsules or liquid: store at room temperature, protected from moisture and light. Does not require refrigeration. Shelf life typically 2 years from manufacture date. Liquid formulations: keep tightly sealed, avoid temperature extremes.`,
    researchStatus: `Not FDA-approved. Investigated by Merck and Lumos Networks for GH deficiency, muscle wasting, and hip fracture. Phase 2/3 trial data exists (MK-677 for hip fracture healing — negative primary endpoint; for GH deficiency — positive IGF-1 data). Widely available as research compound. 2-year trial in healthy older adults confirmed sustained IGF-1 elevation.`,
    references: [
      {
        title: 'A single dose of the growth hormone (GH) secretagogue MK-677 transiently increases GH secretion in a physiological manner in adult GH-deficient patients',
        source: 'Clinical Endocrinology',
        year: 1999,
      },
      {
        title: 'Effects of an oral ghrelin mimetic on body composition and clinical outcomes in healthy older adults: a randomized trial',
        source: 'Annals of Internal Medicine',
        year: 2008,
      },
    ],
    faqs: [
      {
        question: 'Is MK-677 a steroid?',
        answer: 'No. MK-677 is a growth hormone secretagogue — it stimulates your pituitary gland to produce GH, which then raises IGF-1. It has no androgenic or estrogenic activity and does not suppress testosterone. It is not a SARM, steroid, or prohormone. However, because it is not FDA-approved, it operates in the same regulatory grey area as SARMs.',
      },
      {
        question: 'Will I get better results combining MK-677 with peptide injections?',
        answer: 'Combining MK-677 with a GHRH/GHRP injection protocol provides overlapping stimulation of the GH axis from different angles. Whether the additional IGF-1 elevation justifies the added cost and complexity is individual. For most people, choosing one well-executed protocol (either oral MK-677 alone or a quality injection protocol) is more practical and sufficient.',
      },
    ],
  },

  'bpc-157': {
    compoundId: 'bpc-157',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nBPC-157 (Body Protection Compound 157) is a synthetic pentadecapeptide — a 15-amino-acid sequence derived from a protein found in human gastric juice. It is one of the most studied research peptides for tissue healing and is probably the most widely used peptide in the sports performance community outside of GH-axis compounds. In animal studies, BPC-157 has demonstrated remarkable healing effects on tendons, ligaments, muscle, gut lining, bone, and nerve tissue — often accelerating healing timelines significantly compared to controls.\n\nThe mechanism appears to involve upregulation of growth factors (VEGF, EGF, FGF) and promotion of angiogenesis (new blood vessel formation), which is critical for tissue repair since blood supply is what delivers nutrients and oxygen to healing tissue. BPC-157 has also shown strong gastrointestinal protective effects — it can heal leaky gut, protect against NSAID-induced stomach damage, and reduce gut inflammation — which is why it is sometimes used to manage GI side effects from GLP-1 agonists or NSAIDs. Despite extensive animal data, human clinical trial data is limited, and BPC-157 is not FDA-approved for any indication.`,
    mechanismDetail: `BPC-157 modulates multiple growth factor pathways simultaneously. It upregulates VEGF (vascular endothelial growth factor), promoting new blood vessel formation in damaged tissue. It activates the FAK-paxillin pathway, accelerating tendon cell migration to injury sites. It modulates the NO (nitric oxide) system, which regulates vascular tone and inflammation. In the gut, it activates EGR-1 (early growth response gene 1) and promotes mucosal regeneration. It also modulates dopaminergic and serotonergic neurotransmitter systems, which may explain reported mood and anxiety benefits in animal studies. The compound is stable in gastric acid, which makes oral administration effective for gut-specific applications, while injection (subcutaneous or intramuscular, near injury site) is preferred for systemic tissue repair.`,
    commonProtocols: [
      {
        name: 'Injury Recovery — Subcutaneous Injection',
        description: 'Most commonly used protocol for tendon, ligament, and muscle injuries. Injecting subcutaneously near (but not into) the injured area is preferred by many practitioners for localized effect. Daily dosing for acute injuries, tapering to 5 days/week as healing progresses.',
        schedule: 'Daily subcutaneous injection near injury site or general abdominal injection',
        duration: '4–8 weeks for acute injuries; longer for chronic issues',
        startingDose: '200',
        maintenanceDose: '500',
        unit: 'mcg',
        frequency: 'daily',
      },
      {
        name: 'Oral Protocol (GI Focus)',
        description: 'Oral capsules or dissolved powder specifically for gastrointestinal applications (IBD, leaky gut, NSAID damage). BPC-157 is acid-stable and reaches the gut lining intact when taken orally. Less effective for systemic/tendon applications.',
        schedule: 'Oral, twice daily on empty stomach',
        duration: '4–8 weeks',
        startingDose: '250',
        maintenanceDose: '500',
        unit: 'mcg',
        frequency: 'daily',
      },
    ],
    safetyNotes: [
      'BPC-157 has an excellent safety profile in animal studies — no lethal dose has been established even at very high doses in rodents. However, human clinical safety data is extremely limited. Use with that uncertainty in mind.',
      'Nausea and mild dizziness are occasionally reported, particularly at higher doses or when injected too rapidly. Injecting slowly and ensuring good hydration minimizes this.',
      'Theoretical concern: because BPC-157 promotes angiogenesis and growth factor signaling, there is a theoretical (unconfirmed) risk that it could accelerate growth of existing tumors. People with active cancer or strong cancer predisposition should consult an oncologist before use.',
    ],
    stackingInfo: `BPC-157 stacks well with TB-500 for comprehensive injury recovery — the two peptides appear to work through complementary mechanisms. BPC-157 handles local tissue repair and angiogenesis; TB-500 manages inflammation and systemic cellular repair. This combination is the most popular injury recovery stack. BPC-157 is also frequently added to GH-axis protocols (sermorelin, ipamorelin) for athletes seeking enhanced recovery. For GI applications, it can be used alongside glutamine, zinc carnosine, and probiotics.`,
    storageDetail: `Lyophilized powder: store at 2–8°C refrigerated, or -20°C frozen for long-term storage (up to 1 year). Reconstituted with bacteriostatic water: refrigerate, use within 14–28 days. Oral capsules: room temperature, away from moisture and heat. Reconstituted solution is sensitive to UV light — store in opaque containers.`,
    researchStatus: `Not FDA-approved. Research compound only. Extensive animal study data (hundreds of peer-reviewed publications). Small Phase 2 human trials have been conducted for inflammatory bowel disease (patents held by PL-BPC-157 Ltd). No large-scale RCTs in humans published to date. Used widely in sports medicine and anti-aging medicine compounding protocols.`,
    references: [
      {
        title: 'Stable gastric pentadecapeptide BPC 157 in trials for inflammatory bowel disease (PL-10, PLD-116, PL 14736)',
        source: 'Current Pharmaceutical Design',
        year: 2011,
      },
      {
        title: 'BPC 157: a review of central nervous system effects',
        source: 'Behavioural Pharmacology',
        year: 2018,
      },
    ],
    faqs: [
      {
        question: 'Does BPC-157 actually work for tendon injuries in humans?',
        answer: 'The animal data is compelling — multiple studies show accelerated tendon, ligament, and muscle repair. Anecdotally, many athletes and sports medicine practitioners report significant improvements. However, there are no large-scale randomized controlled trials in humans confirming these effects, so the human evidence remains largely anecdotal and mechanistic. Given the excellent safety profile in animal studies, the risk-benefit ratio is considered favorable by many practitioners.',
      },
      {
        question: 'Is oral BPC-157 as effective as injectable?',
        answer: 'For gut-specific conditions (IBD, gastritis, NSAID damage), oral is likely equally or more effective since it delivers the compound directly to the GI mucosa. For systemic applications like tendon healing or muscle repair, injectable (subcutaneous) is generally considered more effective because it ensures systemic bioavailability and allows localized delivery near the injury site.',
      },
    ],
  },

  'tb-500-thymosin-beta-4': {
    compoundId: 'tb-500-thymosin-beta-4',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nTB-500 is a synthetic version of a fragment of Thymosin Beta-4 (Tβ4), a naturally occurring peptide found in virtually every cell in the human body. Tβ4 plays a critical role in regulating actin — a protein fundamental to cell structure and movement. When tissue is injured, Tβ4 is released at high concentrations and appears to coordinate a range of repair processes: reducing inflammation, promoting cell migration, stimulating new blood vessel formation, and facilitating muscle fiber regeneration. TB-500 specifically refers to the actin-binding domain of Tβ4 (the Ac-LKKTETQ fragment), which is believed to be the most biologically active portion.\n\nIn clinical use, TB-500 is used primarily for injury recovery — particularly for muscle tears, soft tissue injuries, and conditions involving chronic inflammation. It is sometimes used for wound healing and hair thinning (some users report hair regrowth, possibly through stem cell activation in hair follicles). Compared to BPC-157, TB-500 is generally considered more systemic in its action (traveling throughout the body via the bloodstream) rather than acting primarily at the injection site. The two are commonly combined for comprehensive tissue repair protocols.`,
    mechanismDetail: `TB-500 (the Ac-LKKTETQ fragment of Tβ4) sequesters G-actin (globular, monomeric actin), preventing it from polymerizing into F-actin (filamentous). By modulating actin dynamics, it controls cell shape, motility, and division. In injured tissue, it promotes upregulation of cell surface receptors for repair signals, accelerates migration of keratinocytes and endothelial cells to the wound, and reduces NF-κB-mediated inflammatory signaling. Tβ4 also activates stem cells (specifically Isl-1+ progenitor cells in cardiac tissue) and stimulates angiogenesis via VEGF pathway crosstalk. Its systemic distribution (it circulates freely in plasma) gives it a broader therapeutic range than locally-acting peptides.`,
    commonProtocols: [
      {
        name: 'Injury Recovery Protocol',
        description: 'Standard protocol for acute or chronic soft tissue injury. Front-loading for first 4–6 weeks at higher frequency, then maintenance. Works best when combined with BPC-157.',
        schedule: 'Twice-weekly subcutaneous injection during loading, then weekly for maintenance',
        duration: '4–8 weeks loading, then 4 weeks maintenance',
        startingDose: '2000',
        maintenanceDose: '2000',
        unit: 'mcg',
        frequency: '2xWeek',
      },
    ],
    safetyNotes: [
      'TB-500 is generally well-tolerated with minimal reported side effects. Mild fatigue and light-headedness have been occasionally reported immediately post-injection.',
      'As with all angiogenesis-promoting peptides, theoretical concern exists around possible stimulation of tumor vascularity. People with active malignancies should avoid use pending more data.',
      'No human clinical trials have been completed; all evidence is from animal studies and anecdotal user reports. Risk profile is unknown in humans beyond short-term use.',
    ],
    stackingInfo: `TB-500 + BPC-157 is the definitive injury recovery stack. TB-500 provides systemic anti-inflammatory and cell repair signaling; BPC-157 provides local angiogenesis and growth factor upregulation. Together they address the repair process from multiple angles. For athletes, this stack is sometimes combined with a GHRH/GHRP protocol (ipamorelin + Mod GRF 1-29) for comprehensive recovery enhancement.`,
    storageDetail: `Lyophilized: refrigerate at 2–8°C or freeze at -20°C for long-term storage. Reconstituted: refrigerate, use within 30 days. Protect from light and heat. Tβ4 is a relatively stable peptide once lyophilized.`,
    researchStatus: `Not FDA-approved. Research compound. Significant animal study evidence for wound healing, cardiac repair, and corneal healing. Phase 1/2 human trials have been conducted for stroke (Tβ4) and wound healing (RegeneRx Biopharmaceuticals), showing safety but with mixed efficacy. No approved indications. Widely compounded for off-label use.`,
    references: [
      {
        title: 'Thymosin beta4 and its role in the CNS and beyond',
        source: 'Expert Opinion on Biological Therapy',
        year: 2007,
      },
      {
        title: 'Thymosin β4 accelerates wound healing',
        source: 'Journal of Investigative Dermatology',
        year: 1999,
      },
    ],
    faqs: [
      {
        question: 'Is TB-500 the same as Thymosin Beta-4?',
        answer: 'TB-500 is a synthetic fragment of Thymosin Beta-4 — specifically the actin-binding domain thought to be responsible for most of Tβ4\'s biological activity. Full-length Tβ4 is the naturally occurring protein; TB-500 is a shorter peptide that is easier and cheaper to synthesize while retaining the key functional domain. They have overlapping but not identical activity profiles.',
      },
    ],
  },

  'pt-141-bremelanotide-research': {
    compoundId: 'pt-141-bremelanotide-research',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nPT-141 is the research/compounded name for bremelanotide — a melanocortin receptor agonist that acts directly on the brain to enhance sexual arousal and function in both men and women. Unlike PDE5 inhibitors (Viagra, Cialis) which work by increasing blood flow to the genitals, PT-141 acts centrally on melanocortin-3 and melanocortin-4 receptors (MC3R and MC4R) in the hypothalamus — the brain region controlling sexual behavior. This central mechanism means it can enhance sexual desire and arousal itself, not just the physical plumbing.\n\nBremelanotide is FDA-approved as Vyleesi for hypoactive sexual desire disorder (HSDD) in premenopausal women (approved 2019). The approved formulation is a subcutaneous auto-injector used on-demand 45 minutes before anticipated sexual activity. In research settings and compounding, lower doses via subcutaneous injection or nasal spray are used for sexual dysfunction in both men and women, as well as erectile dysfunction in men who don't respond adequately to PDE5 inhibitors. Key advantages over PDE5 inhibitors: works in women, works in men who don't respond to Viagra/Cialis, and increases desire (not just performance).`,
    mechanismDetail: `PT-141 is a cyclic heptapeptide derived from alpha-MSH (alpha-melanocyte stimulating hormone). It activates MC3R and MC4R in the hypothalamus and limbic system, where melanocortin signaling modulates sexual behavior, appetite, and inflammation. MC4R activation in the paraventricular nucleus appears specifically linked to pro-erectile and pro-arousal signaling. It does not directly affect genital blood flow at therapeutic doses but promotes central arousal states that lead to genital response. Half-life is approximately 2 hours after subcutaneous injection.`,
    commonProtocols: [
      {
        name: 'On-Demand Use Protocol',
        description: 'Mirrors FDA-approved Vyleesi usage: subcutaneous injection 45 minutes before sexual activity. Start at the lower end to assess side effects (especially nausea and blood pressure changes). Do not exceed once per 24 hours.',
        schedule: 'On demand, 45–60 minutes before sexual activity, maximum once per 24 hours',
        duration: 'As needed, not for continuous daily use',
        startingDose: '0.5',
        maintenanceDose: '2',
        unit: 'mg',
        frequency: 'weekly',
      },
    ],
    safetyNotes: [
      'Nausea is the most common side effect (about 40% of users in trials) and can range from mild to severe enough to vomit. Taking the injection in the evening so you can lie down and sleep through any nausea is a common mitigation strategy. Some practitioners pre-medicate with ondansetron (anti-nausea).',
      'Transient blood pressure changes (usually an initial decrease followed by an increase) occur within the first hour. People with cardiovascular disease, uncontrolled hypertension, or those on antihypertensive medications should use with caution and medical supervision.',
      'Hyperpigmentation (skin darkening) at injection sites or on the face has been reported with repeated use. This is a known melanocortin effect and is generally reversible upon stopping.',
    ],
    stackingInfo: `PT-141 is sometimes combined with PDE5 inhibitors for synergistic effect in men with both desire and performance issues — this combination addresses both central arousal (PT-141) and peripheral blood flow (PDE5i). However, the combination increases the risk of blood pressure fluctuations and should only be done with medical oversight. In women, it is sometimes paired with low-dose testosterone (off-label for HSDD) or DHEA for comprehensive hormonal support.`,
    storageDetail: `Lyophilized compounded powder: refrigerate at 2–8°C. Reconstituted: refrigerate, use within 30 days. FDA-approved Vyleesi auto-injector: room temperature, use immediately after preparation. Protect from freezing and light.`,
    researchStatus: `FDA-approved as Vyleesi for HSDD in premenopausal women (2019). Compounded as PT-141 for broader use (men and women) at various doses. Developed originally as a tanning agent from melanocortin system research. Well-characterized mechanism. Active research in female sexual dysfunction and male ED non-responsive to PDE5i.`,
    references: [
      {
        title: 'Bremelanotide for Female Sexual Dysfunctions in Premenopausal Women — A Randomized, Placebo-Controlled Dose-Finding Trial (RECONNECT)',
        source: 'Obstetrics & Gynecology',
        year: 2016,
      },
      {
        title: 'Bremelanotide: an overview of pharmacology and clinical development for HSDD',
        source: 'Current Sexual Health Reports',
        year: 2020,
      },
    ],
    faqs: [
      {
        question: 'How is PT-141 different from Viagra?',
        answer: 'Viagra (sildenafil) works in the genitals by blocking PDE5, increasing blood flow during sexual stimulation. PT-141 works in the brain by activating melanocortin receptors to increase sexual desire and arousal itself. PT-141 can work even in men who don\'t respond to Viagra and is the only compound with evidence for increasing sexual desire in women. The two mechanisms are complementary.',
      },
    ],
  },

  'melanotan-ii-mt-2': {
    compoundId: 'melanotan-ii-mt-2',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nMelanotan II (MT-2) is a synthetic cyclic analog of alpha-MSH (alpha-melanocyte stimulating hormone) that activates melanocortin receptors (MC1R through MC5R). It was originally developed as a potential sunless tanning agent — by stimulating melanin production in skin cells, it produces a tan without UV exposure. It also has potent effects on sexual function (via MC4R), appetite suppression (MC4R in hypothalamus), and erectile function. It is NOT FDA-approved for any indication and is not the same as bremelanotide/PT-141, though PT-141 was derived from MT-2.\n\nMT-2 is significantly more potent and less selective than PT-141, acting on all five melanocortin receptor subtypes. This broader activity contributes to both its effects (stronger tanning, stronger sexual effects) and its side effect profile (more nausea, more spontaneous erections, more blood pressure changes, more skin changes). The unregulated compounded peptide market carries significant quality concerns. MT-2's main tanning application carries dermatological risks: it changes moles and can make existing moles darker — a change that needs monitoring by a dermatologist since it makes melanoma surveillance more difficult.`,
    mechanismDetail: `MT-2 activates all five melanocortin receptor subtypes (MC1R–MC5R). MC1R stimulation in melanocytes triggers melanin synthesis (tanning). MC4R activation drives appetite suppression and sexual arousal/function (same mechanism as PT-141). MC3R and MC4R activation also affects energy homeostasis. MT-2 is a cyclic heptapeptide with a disulfide bridge; cyclic structure increases receptor affinity and resistance to enzymatic degradation compared to linear MSH analogs. Half-life is approximately 30–60 minutes after subcutaneous injection.`,
    commonProtocols: [
      {
        name: 'Tanning/Pigmentation Protocol',
        description: 'Low, gradual doses to minimize side effects while building melanin over time. Nausea is virtually universal at first — evening injections help. Tanning effect becomes visible within 1–2 weeks with some UV exposure. Maintenance doses every few days sustain the tan.',
        schedule: 'Daily subcutaneous injection during loading, then 2–3x weekly maintenance',
        duration: '2–4 weeks loading, then maintenance as desired',
        startingDose: '0.25',
        maintenanceDose: '0.5',
        unit: 'mg',
        frequency: 'daily',
      },
    ],
    safetyNotes: [
      'MT-2 causes darkening of existing moles and can cause new nevi (moles) to appear or change. This is a serious dermatological concern — it makes monitoring for melanoma significantly harder. Annual (or more frequent) full-body skin checks by a dermatologist are mandatory for anyone using MT-2.',
      'Nausea and facial flushing are nearly universal at doses above 0.25–0.5 mg, especially early in use. Starting extremely low (0.1–0.25 mg) and increasing gradually is essential.',
      'Spontaneous erections (in men) are a common and sometimes unwanted side effect at therapeutic doses. This is a direct MC4R effect.',
      'MT-2 is not regulated, and many gray-market sources have been found to contain incorrect doses, contamination, or substitute compounds. Source quality is a significant safety concern.',
    ],
    stackingInfo: `MT-2 is not commonly recommended for stacking given its broad receptor activity and concerning side effect profile. It is sometimes used by bodybuilders before competitions for cosmetic tanning. Because of overlapping mechanisms with PT-141, they should not be combined. MT-2's appetite suppression may be useful for weight management goals but is unpredictable and not a reliable primary tool.`,
    storageDetail: `Lyophilized: refrigerate at 2–8°C. Reconstituted: refrigerate, use within 30 days. Extremely sensitive to UV degradation — store in amber vials or wrapped in foil. Multiple freeze-thaw cycles reduce potency.`,
    researchStatus: `Not FDA-approved for any indication. PT-141 (bremelanotide) was derived from MT-2 and went on to receive FDA approval for HSDD in women; MT-2 itself was not developed further pharmaceutically. Research use only. Considered higher risk than PT-141 due to its non-selective melanocortin receptor activation.`,
    references: [
      {
        title: 'Melanocortin receptor agonists: from bench to bedside',
        source: 'Journal of Medicinal Chemistry',
        year: 2004,
      },
    ],
    faqs: [
      {
        question: 'Is Melanotan II safe to use for tanning?',
        answer: 'MT-2 presents meaningful risks, particularly the potential to mask melanoma by darkening existing moles and creating new skin changes that complicate dermatological monitoring. Combined with the lack of FDA approval, uncertain product quality from compounding sources, and its potent systemic hormonal effects, MT-2 is generally considered higher risk than most research peptides. Its use should involve full dermatological monitoring and medical supervision.',
      },
    ],
  },

  'thymosin-alpha-1-ta-1': {
    compoundId: 'thymosin-alpha-1-ta-1',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nThymosin Alpha-1 (Tα1) is a 28-amino-acid peptide naturally produced by the thymus gland that plays a central role in immune system regulation. It modulates T-cell function — the immune cells responsible for identifying and eliminating virally infected cells and cancer cells — and enhances innate immune responses. It has FDA Orphan Drug status for DiGeorge syndrome and is approved in over 35 countries (marketed as Zadaxin) for hepatitis B, hepatitis C, and as an adjunct in cancer chemotherapy and sepsis management.\n\nIn the research and compounding community, Tα1 is used for immune system support, chronic infections, long COVID recovery, and as an adjunct to cancer therapy. It has a remarkable safety record — decades of clinical use in Asia and Europe with essentially no serious adverse effects reported. Unlike immunosuppressants or immune stimulants that broadly upregulate or downregulate immunity, Tα1 is described as an immune modulator that normalizes dysregulated immune function rather than simply stimulating it.`,
    mechanismDetail: `Tα1 binds to Toll-like receptor 9 (TLR9) on dendritic cells and monocytes, triggering innate immune activation and upregulation of type I interferons. It increases differentiation of T-helper cells (Th1 polarization), promotes natural killer (NK) cell activity, and enhances cytotoxic T lymphocyte responses. In immunocompromised states, it restores T-cell function. In autoimmune or inflammatory states, it may paradoxically reduce excessive immune activation by restoring regulatory T-cell (Treg) populations. Half-life after subcutaneous injection is approximately 2 hours.`,
    commonProtocols: [
      {
        name: 'Immune Support / Chronic Infection Protocol',
        description: 'Standard protocol used for immune modulation in chronic viral infections, long COVID, or general immune dysfunction. Twice-weekly injections are the most common schedule, based on approved use in hepatitis management.',
        schedule: 'Twice-weekly subcutaneous injection',
        duration: '6–12 months depending on indication',
        startingDose: '1.6',
        maintenanceDose: '1.6',
        unit: 'mg',
        frequency: '2xWeek',
      },
    ],
    safetyNotes: [
      'Thymosin Alpha-1 has one of the most favorable safety profiles of any peptide in clinical use — decades of use across multiple countries with no serious drug-related adverse events reported in clinical trials.',
      'Mild injection site reactions (redness, swelling) are the most commonly reported effects. These are typically minor and self-resolving.',
      'Because Tα1 modulates immune function, theoretical caution is warranted in people on strong immunosuppressive therapy (organ transplant patients) — enhanced immune activity could theoretically contribute to rejection. Discuss with a transplant specialist.',
    ],
    stackingInfo: `Tα1 is frequently combined with LL-37 (another immune-modulating peptide) for synergistic effects on innate immunity. In comprehensive protocols, it may be added alongside BPC-157 for recovery from infection or chronic illness. For cancer support (adjunct to chemotherapy), Tα1 has been combined with standard chemotherapy protocols in Asian clinical settings with published trial data. It is compatible with most other compounds due to its immune-specific mechanism.`,
    storageDetail: `Lyophilized: stable at room temperature for short periods, but refrigerate at 2–8°C for optimal shelf life. Reconstituted: refrigerate, use within 24 hours (no preservative in standard formulations). Zadaxin vials contain 1.6 mg lyophilized powder with a sterile water diluent.`,
    researchStatus: `FDA Orphan Drug status for DiGeorge anomaly. Approved in 35+ countries for hepatitis B, hepatitis C, and immune deficiency. Extensive published clinical trial data from Asian populations. Active research in long COVID, sepsis, and cancer immunotherapy. Not FDA-approved as a standard pharmaceutical in the United States for general use.`,
    references: [
      {
        title: 'Thymosin alpha1 in the treatment of chronic hepatitis C: a meta-analysis',
        source: 'World Journal of Gastroenterology',
        year: 2004,
      },
      {
        title: 'Thymosin alpha-1 treatment for severe and critical COVID-19',
        source: 'Clinical Immunology',
        year: 2020,
      },
    ],
    faqs: [
      {
        question: 'Can Tα1 help with long COVID?',
        answer: 'Preliminary reports and some small studies suggest Tα1 may help with immune dysregulation seen in long COVID — particularly the persistent T-cell exhaustion and dysregulated interferon responses. It was used in China and Italy early in the pandemic for acute severe COVID with some published positive results. Long COVID applications remain investigational but represent an active area of research given Tα1\'s immune-normalizing mechanism.',
      },
    ],
  },

  'ghk-cu-copper-peptide': {
    compoundId: 'ghk-cu-copper-peptide',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nGHK-Cu (glycine-histidine-lysine copper complex) is a naturally occurring tripeptide that binds copper ions. It is found in human blood plasma, saliva, and urine at concentrations that decline significantly with age (from ~200 ng/mL at age 20 to ~80 ng/mL by age 60). GHK-Cu plays a role in wound healing, tissue remodeling, skin regeneration, anti-inflammatory signaling, and potentially neuroprotection. It activates over 4,000 human genes involved in tissue repair, immune function, and the nervous system according to gene expression analysis — earning it significant interest in anti-aging research.\n\nGHK-Cu is widely used in topical skin care products for anti-aging purposes (collagen stimulation, skin tightening, reduction of fine lines) and is one of the most well-validated peptides in cosmeceutical use. Injectable GHK-Cu is used by some practitioners for systemic tissue regeneration, hair loss, and broader anti-aging effects. The copper component is essential — copper-free GHK has significantly less biological activity.`,
    mechanismDetail: `GHK-Cu's copper complex activates the enzyme superoxide dismutase and other antioxidant systems, while also modulating TGF-beta signaling (wound healing), upregulating collagen, elastin, and glycosaminoglycan production in fibroblasts, and activating VEGF for angiogenesis. Importantly, GHK-Cu acts as a "tissue regeneration signal" — in gene expression studies, it reverses gene expression patterns associated with aging and disease toward those of younger, healthier tissue. The copper is transported into cells via the CTR1 copper transporter. In skin, topical application increases skin density and reduces wrinkle depth in clinical studies.`,
    commonProtocols: [
      {
        name: 'Injectable Systemic Protocol',
        description: 'Subcutaneous injection protocol for systemic anti-aging and tissue repair. Often combined with BPC-157 and TB-500 in comprehensive recovery and anti-aging stacks.',
        schedule: 'Daily subcutaneous injection, 5 days on / 2 days off',
        duration: '4–8 week cycles',
        startingDose: '1',
        maintenanceDose: '2',
        unit: 'mg',
        frequency: 'daily',
      },
    ],
    safetyNotes: [
      'GHK-Cu has a strong safety record in topical applications with decades of cosmeceutical use. Injectable GHK-Cu has limited human safety data — while the peptide itself is naturally occurring, concentrated injectable forms have not been rigorously studied.',
      'Copper toxicity is a theoretical concern with excessive doses — copper is essential but toxic in excess. Standard GHK-Cu doses used in research involve very small amounts of copper, but monitoring is reasonable for long-term protocols.',
    ],
    stackingInfo: `GHK-Cu is a natural addition to anti-aging and recovery stacks. It pairs well with BPC-157 and TB-500 for tissue repair, and with GHRH/GHRP protocols for comprehensive anti-aging approaches. Topical GHK-Cu can be used concurrently with injectable protocols for combined systemic and local skin effects. It is also used in hair loss protocols, sometimes combined with minoxidil topically.`,
    storageDetail: `Injectable: lyophilized or liquid formulations, refrigerate at 2–8°C. Topical serums: room temperature, away from light. GHK-Cu is relatively stable in solution but should be protected from UV degradation which can reduce activity.`,
    researchStatus: `Not FDA-approved for injection. Extensively used in cosmeceutical/topical products with significant published evidence for skin collagen stimulation. Some small human studies on injectable forms exist. Loren Pickart (discoverer of GHK-Cu) has published extensively on its gene regulation effects. Active research in lung fibrosis, nerve regeneration, and cancer gene expression.`,
    references: [
      {
        title: 'The human tripeptide GHK-Cu in prevention of oxidative stress and degenerative conditions of aging: implications for cognitive health',
        source: 'Oxidative Medicine and Cellular Longevity',
        year: 2012,
      },
    ],
    faqs: [
      {
        question: 'Does GHK-Cu actually work for anti-aging?',
        answer: 'For topical skin applications, the evidence is reasonably strong — multiple small clinical studies show improvements in skin density, elasticity, and wrinkle reduction. For injectable systemic anti-aging effects, the evidence is more theoretical and based on gene expression data rather than clinical outcomes trials. The naturally occurring, non-toxic nature of GHK-Cu makes it a lower-risk exploration for those interested in the area.',
      },
    ],
  },

  'aod-9604': {
    compoundId: 'aod-9604',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nAOD-9604 (Anti-Obesity Drug 9604) is a synthetic peptide fragment of human growth hormone — specifically the C-terminal fragment (amino acids 176–191 of the 191-amino-acid GH molecule) with an additional tyrosine residue at the N-terminus. This fragment was identified as the region of GH responsible for fat-burning (lipolytic) activity, without the growth-promoting and insulin-sensitizing effects of full GH. The concept was to capture GH's fat-loss benefits while avoiding the side effects associated with full GH therapy (acromegaly, insulin resistance, tumor growth).\n\nAOD-9604 was originally developed by Monash University and licensed to pharmaceutical companies as an anti-obesity drug. It reached Phase 3 clinical trials, where it was found to be safe but ultimately did not demonstrate statistically significant weight loss versus placebo in a large randomized trial (published 2009). Despite the failed Phase 3, it is now widely used as a compounded research peptide in the body composition community, where users often report fat loss effects at doses similar to those used in early-phase trials. The compound has achieved GRAS (Generally Recognized as Safe) status for use in food/supplements with the FDA.`,
    mechanismDetail: `AOD-9604 binds to the beta-3 adrenergic receptor and appears to stimulate fat breakdown (lipolysis) in adipose tissue through a mechanism that does not involve the GH receptor or IGF-1 pathway. This means it does not raise IGF-1, does not promote tissue growth, and does not cause insulin resistance — the major concerns with full GH use. It also appears to inhibit lipogenesis (new fat creation). In animal studies, it produced significant fat loss without muscle loss or metabolic disruption. The disconnect between strong animal data and weak Phase 3 human trial data is the core scientific uncertainty around this peptide.`,
    commonProtocols: [
      {
        name: 'Daily Injection Fat Loss Protocol',
        description: 'Most common protocol based on doses used in Phase 1/2 trials. Inject subcutaneously in the morning, fasted, for best fat oxidation timing. Effects take several weeks to become apparent.',
        schedule: 'Daily subcutaneous injection, morning fasted',
        duration: '8–12 week cycles',
        startingDose: '250',
        maintenanceDose: '500',
        unit: 'mcg',
        frequency: 'daily',
      },
    ],
    safetyNotes: [
      'AOD-9604 has demonstrated an excellent safety profile across Phase 1, 2, and 3 clinical trials — no significant adverse effects were reported even at doses up to 9 mg daily (18x the typical therapeutic dose). Its GRAS status for food use reflects this safety record.',
      'Because it does not act through IGF-1 or GH receptor, it does not carry the cancer-stimulation theoretical risk of full GH therapy. This is considered one of its key safety advantages.',
    ],
    stackingInfo: `AOD-9604 is frequently combined with CJC-1295/ipamorelin protocols as a "fat-specific" complement to the GH-axis stimulation (which raises IGF-1 and has more anabolic effects). The rationale is that AOD-9604 adds fat lipolysis without adding to IGF-1 levels. It is also combined with GLP-1 agonists in some body composition protocols for synergistic fat loss through complementary mechanisms. Often used in peptide "stacks" for cutting phases in bodybuilding contexts.`,
    storageDetail: `Lyophilized: refrigerate at 2–8°C. Reconstituted with bacteriostatic water: refrigerate, use within 30 days. More stable than many peptides due to its short, simple structure. Protect from light.`,
    researchStatus: `Not FDA-approved as a drug. GRAS status for food use obtained in 2014. Phase 3 clinical trial for obesity (completed ~2008) showed safety but did not meet primary weight loss endpoint. Widely used as compounded research peptide. Original Monash University/Metabolic Pharmaceuticals research established foundational data.`,
    references: [
      {
        title: 'The lipolytic effect of a fragment of human growth hormone-(176-191)',
        source: 'Endocrinology',
        year: 1996,
      },
    ],
    faqs: [
      {
        question: 'If AOD-9604 failed Phase 3 trials, why do people still use it?',
        answer: 'The Phase 3 trial failure was for oral administration at 1 mg/day — not injectable. Many practitioners believe that injectable AOD-9604 (which avoids first-pass metabolism and delivers the peptide directly into circulation) may have meaningfully different bioavailability than the oral dose used in Phase 3. Anecdotal reports from injectable use are generally more positive than what the oral trial showed. The safety record from the trials does give some confidence that injectable use is not dangerous.',
      },
    ],
  },

'follistatin-344': {
    compoundId: 'follistatin-344',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nFollistatin-344 is a naturally occurring protein that acts as a powerful inhibitor of myostatin — a protein that limits muscle growth. By binding and neutralizing myostatin, follistatin-344 theoretically removes the "brake" on muscle development, allowing greater hypertrophy. In animal models, follistatin knockout and overexpression studies have produced dramatic muscle mass increases. The 344 designation refers to the 344-amino-acid isoform of follistatin. Despite enormous bodybuilding community interest, follistatin-344 has very limited human data, no FDA approval, is extremely difficult to produce correctly (as a large protein it degrades quickly), and many compounded products on the gray market are of questionable quality or are mislabeled. The risks include uncontrolled muscle fiber proliferation, joint stress from disproportionate muscle growth, and unknown long-term effects.`,
    mechanismDetail: `Follistatin-344 sequesters activin and myostatin (both TGF-beta superfamily members) with high affinity, preventing them from binding their receptors. Myostatin (GDF-8) binding to ActRIIB/ALK4 receptors normally activates SMAD2/3 signaling in muscle cells, suppressing protein synthesis and activating muscle atrophy pathways. Follistatin binding to myostatin prevents this signaling, allowing unopposed muscle protein synthesis. Follistatin also binds activin, which has roles in reproductive biology, adding to the complexity of systemic effects.`,
    commonProtocols: [
      {
        name: 'Research Protocol',
        description: 'Based on limited human use reports in the bodybuilding community. Intramuscular injection into target muscle groups. Cycles must be short due to receptor downregulation and product stability concerns.',
        schedule: 'Once daily intramuscular injection into target muscle, 10-day cycles',
        duration: '10 days on, extended break (4–6 weeks)',
        startingDose: '50',
        maintenanceDose: '100',
        unit: 'mcg',
        frequency: 'daily',
      },
    ],
    safetyNotes: [
      'Follistatin inhibits activin, which has roles in female reproductive function and other biological processes beyond muscle. Systemic disruption of the activin/myostatin axis could have unintended effects on fertility, bone, and cardiovascular function.',
      'As a large protein molecule (~35 kDa), follistatin-344 is extremely difficult to produce in a stable, correctly folded form. Many commercial research peptides labeled as follistatin-344 are likely degraded, incorrectly folded, or misidentified. Purity and authenticity concerns are particularly serious for this compound.',
    ],
    stackingInfo: `Follistatin-344 is theoretically most powerful when combined with anabolic compounds (testosterone, IGF-1, growth hormone) that drive protein synthesis — removing the myostatin brake is most effective when anabolic signals are high. However, the uncertain safety profile makes stacking with other compounds inadvisable for most users.`,
    storageDetail: `Must be kept frozen at -20°C or colder as a lyophilized powder. Extremely unstable once reconstituted — use within 24–48 hours at most. Any temperature excursion during shipping or storage likely destroys activity. This is the most storage-sensitive compound in the database.`,
    researchStatus: `Not FDA-approved. No human clinical trials for muscle-building purposes. Animal gene therapy studies exist. Used as research compound in the bodybuilding community. Product quality from commercial sources is a major concern.`,
    references: [
      {
        title: 'Follistatin-mediated skeletal muscle hypertrophy is regulated by Smad3 and mTOR independently of myostatin',
        source: 'Nature Cell Biology',
        year: 2009,
      },
    ],
    faqs: [
      {
        question: 'Does follistatin-344 actually build muscle in humans?',
        answer: 'The animal data is dramatic, but human data is essentially absent from controlled trials. The practical barrier is that follistatin-344 is a large protein that degrades rapidly, is difficult to synthesize correctly, and is almost certainly poorly bioavailable from most compounded sources. The dramatic muscle-building effects seen in genetically modified animals require sustained, systemic follistatin upregulation that a periodic injection is unlikely to replicate.',
      },
    ],
  },

  'mots-c': {
    compoundId: 'mots-c',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nMOTS-c is a mitochondrial-derived peptide (MDP) — a small 16-amino-acid peptide encoded within the 12S ribosomal RNA gene of the mitochondrial genome. This makes MOTS-c unusual: most peptides used in research are encoded in the nuclear genome; MOTS-c is one of a small family of peptides whose genes live inside the mitochondria themselves. It was discovered in 2015 by researchers at USC. MOTS-c appears to function as a metabolic regulator, improving insulin sensitivity, increasing fatty acid oxidation, and protecting against diet-induced obesity and metabolic decline. In animal studies, treatment with MOTS-c in aged mice restored physical performance to levels comparable to young mice, generating significant interest in aging and longevity research. Human data is limited but Phase 1 safety studies have been published.`,
    mechanismDetail: `MOTS-c activates AMPK (AMP-activated protein kinase) — the cell's master energy sensor — in skeletal muscle cells, promoting glucose uptake and fatty acid oxidation. It also activates the FOXO pathway and Nrf2, both important for cellular stress resistance and longevity signaling. MOTS-c is released from mitochondria into the cytoplasm and then the bloodstream in response to metabolic stress, acting as a mitokine — a hormone-like signal from mitochondria to the whole body.`,
    commonProtocols: [
      {
        name: 'Metabolic Health Research Protocol',
        description: 'Based on doses used in early human and animal studies. Subcutaneous injection, typically 3 times per week. Human research is very early-stage.',
        schedule: 'Three times weekly subcutaneous injection',
        duration: '8–12 week cycles',
        startingDose: '5',
        maintenanceDose: '10',
        unit: 'mg',
        frequency: '3xWeek',
      },
    ],
    safetyNotes: [
      'MOTS-c is very early in human research — Phase 1 trials have established basic safety but the compound should be considered investigational with an incompletely characterized safety profile.',
      'The AMPK-activating mechanism overlaps with metformin (which also activates AMPK). The combination of MOTS-c with metformin is theoretically potent but has not been formally studied.',
    ],
    stackingInfo: `MOTS-c is sometimes combined with other mitochondria-targeting compounds (CoQ10, NAD+ precursors like NMN, alpha-lipoic acid) in longevity-focused protocols. Pairing with exercise amplifies AMPK activation through complementary pathways. Avoid combining with compounds that inhibit AMPK (certain anesthetics, high-dose alcohol).`,
    storageDetail: `Lyophilized powder: refrigerate at 2–8°C. Reconstituted: refrigerate, use within 14 days. More stable than many larger peptides due to its small size (16 amino acids).`,
    researchStatus: `Not FDA-approved. Discovered 2015, first published in Cell Metabolism. Phase 1 human safety trial completed (USC, 2021). Active research in aging, insulin resistance, and exercise physiology. Very early clinical stage.`,
    references: [
      {
        title: 'MOTS-c is an exercise-induced mitochondrial-encoded regulator of age-dependent physical decline and muscle homeostasis',
        source: 'Nature Communications',
        year: 2021,
      },
    ],
    faqs: [
      {
        question: 'Why is MOTS-c exciting for anti-aging?',
        answer: 'MOTS-c declines with age in both humans and animals, and restoring levels in aged mice reversed metabolic decline and physical performance loss. It appears to be one mechanism through which exercise benefits health at the molecular level — MOTS-c is released by working muscles and acts as a systemic metabolic signal. If it can be safely supplemented, it may represent a way to partially replicate the metabolic benefits of exercise, particularly interesting for elderly or mobility-impaired individuals.',
      },
    ],
  },

  'teriparatide': {
    compoundId: 'teriparatide',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nTeriparatide (brand name Forteo) is the synthetic form of parathyroid hormone (PTH 1-34) — the first 34 amino acids of the 84-amino-acid PTH molecule, which contains full biological activity. Parathyroid hormone is naturally produced by the parathyroid glands to regulate calcium and phosphate metabolism and bone turnover. Teriparatide is FDA-approved for treating osteoporosis in postmenopausal women and men at high fracture risk, as well as osteoporosis associated with long-term glucocorticoid use. Unlike bisphosphonates (which prevent bone breakdown), teriparatide is an anabolic bone agent — it stimulates new bone formation, actually building bone density. In clinical trials, it reduced vertebral fracture risk by ~65% and non-vertebral fractures by ~53%. It is also being explored in research settings for accelerating fracture healing and improving bone regeneration after procedures.`,
    mechanismDetail: `When administered as an intermittent daily injection (rather than continuous infusion, which causes bone resorption), PTH(1-34) primarily stimulates osteoblasts (bone-building cells) to increase bone formation through IGF-1 upregulation, Wnt pathway activation, and suppression of osteoblast apoptosis. This anabolic net effect is unique among approved osteoporosis drugs. The PTH receptor (PTH1R) is a G-protein coupled receptor activating cAMP/PKA and IP3/calcium pathways.`,
    commonProtocols: [
      {
        name: 'FDA-Approved Osteoporosis Protocol',
        description: 'The only approved dosing regimen. Daily subcutaneous injection of 20 mcg using the Forteo pen device. Treatment is limited to 2 years due to bone tumor concerns from long-term rodent studies.',
        schedule: 'Daily subcutaneous injection into thigh or abdomen, same time each day',
        duration: 'Maximum 2 years (FDA label limit)',
        startingDose: '20',
        maintenanceDose: '20',
        unit: 'mcg',
        frequency: 'daily',
      },
    ],
    safetyNotes: [
      'Teriparatide carries a black-box warning for osteosarcoma (bone cancer) based on rat studies showing increased osteosarcoma incidence with high, prolonged doses. The relevance to humans at therapeutic doses appears low (post-marketing surveillance of millions of patients has not shown elevated osteosarcoma rates), but the 2-year treatment limit reflects this concern. Contraindicated in people at increased risk of osteosarcoma (Paget\'s disease, prior radiation to bone, pediatric patients).',
      'Orthostatic hypotension (dizziness when standing) can occur after injection, particularly with the first few doses. Sitting or lying down for 15–30 minutes after injection is recommended when starting therapy.',
    ],
    stackingInfo: `After completing a teriparatide course, transitioning to an antiresorptive agent (bisphosphonate or denosumab) is critical — the bone gained with teriparatide is rapidly lost without follow-up antiresorptive therapy. In research settings, teriparatide is being studied in combination with antiresorptive agents for additive bone benefit. In fracture healing protocols, local injection near fracture sites is being investigated.`,
    storageDetail: `Refrigerate at 2–8°C. Do not freeze. The Forteo pen can be kept in the refrigerator between uses — do not leave outside refrigerator for more than the injection period. Each pen delivers 28 daily doses. Discard 28 days after first use even if doses remain.`,
    researchStatus: `FDA-approved for osteoporosis (Forteo, 2002). Available as generic teriparatide injection (Bonsity, 2021 — interchangeable biosimilar). Active research in fracture healing, implant osseointegration (dental/orthopedic), and combination regimens with antiresorptive agents.`,
    references: [
      {
        title: 'Effect of parathyroid hormone (1-34) on fractures and bone mineral density in postmenopausal women with osteoporosis (FPT trial)',
        source: 'New England Journal of Medicine',
        year: 2001,
      },
    ],
    faqs: [
      {
        question: 'Is teriparatide only for people with osteoporosis?',
        answer: 'Its FDA approval is specifically for osteoporosis. In research settings, it is being explored for accelerating fracture healing in people without osteoporosis — particularly for difficult-to-heal fractures like stress fractures in athletes. These applications are off-label and supported by early-phase trials but not yet standard of care.',
      },
    ],
  },

  'abaloparatide': {
    compoundId: 'abaloparatide',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nAbaloparatide (brand name Tymlos) is a synthetic analog of PTHrP (parathyroid hormone-related protein) — specifically an engineered 34-amino-acid peptide with modifications that make it preferentially activate a specific PTH1R receptor conformation (RG state) linked to anabolic bone effects while reducing activation of the resorption-promoting receptor state. Approved by the FDA in 2017 for osteoporosis in postmenopausal women at high fracture risk, abaloparatide was compared head-to-head with teriparatide in the ACTIVE trial and showed comparable or slightly better reductions in vertebral and non-vertebral fractures with a potentially more favorable safety profile (fewer hypercalcemia events). Like teriparatide, it is an anabolic bone agent — it builds bone rather than just preventing its breakdown. Treatment is limited to 18 months. It is a newer, second-generation alternative to teriparatide.`,
    mechanismDetail: `Abaloparatide preferentially binds the RG conformation of PTH1R (the G-protein coupled state associated with transient, anabolic signaling) over the R0 conformation (associated with prolonged, resorptive signaling). This receptor selectivity theoretically produces more bone building with less bone resorption than teriparatide. Like PTH, it activates cAMP/PKA and downstream osteoblast stimulation pathways, but the modified amino acid sequence shifts the balance toward anabolic over catabolic effects.`,
    commonProtocols: [
      {
        name: 'FDA-Approved Osteoporosis Protocol',
        description: 'Once-daily injection using the Tymlos pen. The 80 mcg dose is the only approved dose. Treatment duration is limited to 18 months. Must be followed by antiresorptive therapy to maintain bone gains.',
        schedule: 'Daily subcutaneous injection into periumbilical abdominal region',
        duration: 'Maximum 18 months',
        startingDose: '80',
        maintenanceDose: '80',
        unit: 'mcg',
        frequency: 'daily',
      },
    ],
    safetyNotes: [
      'Carries the same black-box warning for osteosarcoma as teriparatide based on rodent studies. Contraindicated in the same high-risk populations (Paget\'s disease, bone radiation history, pediatric patients). The 18-month treatment limit reflects this.',
      'Palpitations and increased heart rate have been reported transiently after injection — more common early in therapy and typically self-resolving. Monitor if you have pre-existing arrhythmias.',
    ],
    stackingInfo: `Like teriparatide, abaloparatide must be followed by antiresorptive therapy after completing the course. It should not be used simultaneously with teriparatide or other PTH analogs. Post-abaloparatide treatment with zoledronic acid (ATOM trial data) shows significant additional bone density gains.`,
    storageDetail: `Refrigerate at 2–8°C before first use. After first use, store at room temperature (20–25°C) for up to 30 days. Do not refrigerate the pen after first use — this causes precipitation. Do not freeze. Each pen provides 30 daily doses.`,
    researchStatus: `FDA-approved for osteoporosis in postmenopausal women at high fracture risk (Tymlos, 2017). Active research in male osteoporosis and fracture healing. Available as branded product only (no generic as of 2024). ACTIVE trial established non-inferiority to teriparatide with fewer hypercalcemia events.`,
    references: [
      {
        title: 'Abaloparatide versus placebo and teriparatide for osteoporosis in postmenopausal women (ACTIVE trial)',
        source: 'JAMA',
        year: 2016,
      },
    ],
    faqs: [
      {
        question: 'Should I choose abaloparatide or teriparatide?',
        answer: 'Both are anabolic bone agents with similar efficacy. Abaloparatide showed slightly lower hypercalcemia rates and a slightly different fracture risk reduction profile in the ACTIVE trial. The choice is largely made by prescribers based on cost (both are expensive), patient preference (pen device differences), and specific fracture risk patterns. For most patients, the difference in clinical outcomes is modest.',
      },
    ],
  },

  'insulin-various': {
    compoundId: 'insulin-various',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nInsulin is a 51-amino-acid peptide hormone produced by beta cells of the pancreas, essential for glucose uptake into cells. Without insulin, cells cannot use glucose for energy — the basis of diabetes mellitus. Multiple insulin formulations exist ranging from rapid-acting (insulin lispro, aspart, glulisine — peaks in 30–90 minutes), short-acting (regular insulin — peaks in 2–4 hours), intermediate-acting (NPH — peaks in 4–12 hours), to long-acting (glargine, detemir, degludec — relatively flat 24-hour profile). All are FDA-approved prescription medications for diabetes management. In the bodybuilding and performance community, insulin is used illicitly due to its potent anabolic effects — it drives amino acids and glucose into muscle cells and suppresses muscle protein breakdown. However, insulin use outside of medical supervision in non-diabetics is extremely dangerous — hypoglycemia (low blood sugar) can cause seizures, coma, and death within minutes. Insulin is one of the most dangerous compounds in any performance-enhancing context.`,
    mechanismDetail: `Insulin binds the insulin receptor (a tyrosine kinase receptor) on muscle, fat, and liver cells, triggering IRS-1/PI3K/Akt signaling. Akt activation drives GLUT-4 transporter translocation to cell surfaces (enabling glucose uptake), activates mTOR (stimulating protein synthesis), and inhibits FOXO transcription factors (suppressing protein breakdown genes). In the liver, insulin suppresses gluconeogenesis. The net effect is potent nutrient storage in muscle and fat, glucose clearance from blood, and anabolism.`,
    commonProtocols: [
      {
        name: 'Medical Diabetes Management',
        description: 'Insulin dosing for diabetes is highly individualized and must be supervised by an endocrinologist or diabetes specialist. No fixed protocol applies — doses are titrated to blood glucose targets. This entry describes only the general framework.',
        schedule: 'Varies by formulation and individual regimen — basal-bolus, sliding scale, or pump',
        duration: 'Lifelong for type 1 diabetes; variable for type 2',
        startingDose: '0.1',
        maintenanceDose: '0.5',
        unit: 'IU/kg',
        frequency: 'daily',
      },
    ],
    safetyNotes: [
      'CRITICAL SAFETY WARNING: Insulin use in non-diabetic individuals for body composition is extremely dangerous. Hypoglycemia from even a modest insulin dose in a non-diabetic person can cause rapid loss of consciousness, seizures, brain damage, and death. Insulin use for performance purposes without medical supervision and constant glucose monitoring is NOT recommended under any circumstances.',
      'Hypoglycemia symptoms — shakiness, sweating, confusion, rapid heartbeat — can progress to seizure and unconsciousness within minutes. Anyone using insulin must have fast-acting glucose (glucose tablets, juice) immediately available at all times.',
    ],
    stackingInfo: `In diabetes management, insulin is commonly combined with metformin, GLP-1 agonists, and SGLT-2 inhibitors. In these medical contexts, GLP-1 agonists like semaglutide and tirzepatide often allow insulin dose reductions. No performance-enhancement stacking guidance is provided here due to the extreme safety risks involved in non-medical insulin use.`,
    storageDetail: `Unopened vials/pens: refrigerate at 2–8°C. Opened/in-use vials or pens: room temperature (below 30°C) for up to 28–30 days depending on formulation. Never freeze insulin. Protect from direct sunlight and heat. Cloudy rapid-acting insulin (except NPH and pre-mixed) indicates degradation — discard.`,
    researchStatus: `All major insulin formulations are FDA-approved for diabetes management. Biosimilar insulins (Semglee, Rezvoglar, etc.) are FDA-approved interchangeable products. Active research in ultra-long-acting formulations (once-weekly insulin — icodec is approved in some countries), smart insulins, and glucose-responsive insulin.`,
    references: [
      {
        title: 'Insulin therapy in type 2 diabetes mellitus: a practical guide',
        source: 'Annals of Internal Medicine',
        year: 2014,
      },
    ],
    faqs: [
      {
        question: 'Is insulin ever used safely in non-diabetic athletes?',
        answer: 'Elite bodybuilders have used insulin (particularly fast-acting formulations around workouts) for its anabolic effects for decades, but this practice carries life-threatening hypoglycemia risk. There is no safe way to use insulin for performance enhancement without continuous blood glucose monitoring, immediate access to glucose, and medical supervision. Multiple deaths in competitive bodybuilding have been attributed to insulin misuse. This is not a recommendation to use insulin outside medical supervision.',
      },
    ],
  },

  'pramlintide': {
    compoundId: 'pramlintide',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nPramlintide (brand name Symlin) is a synthetic analog of amylin — a peptide co-secreted with insulin by pancreatic beta cells that helps regulate blood sugar after meals. Amylin normally complements insulin by slowing gastric emptying, suppressing glucagon release, and promoting satiety. People with type 1 diabetes (and some with type 2) are amylin-deficient because their beta cells are destroyed or dysfunctional. Pramlintide replaces this missing amylin signal, working alongside insulin to improve post-meal glucose control. It is FDA-approved as an adjunct to insulin in both type 1 and type 2 diabetes. Beyond glycemic benefits, pramlintide causes meaningful weight loss — typically 1.5–3.5 kg in trials — through its satiety and gastric emptying effects, making it occasionally used in research contexts for weight management.`,
    mechanismDetail: `Pramlintide is a 37-amino-acid peptide with three amino acid substitutions from human amylin (Pro25, Pro28, Pro29) to prevent the amyloid self-aggregation that native amylin undergoes at high concentrations. It activates amylin receptors (complexes of calcitonin receptor + RAMPs) in the area postrema (brainstem), suppressing glucagon secretion from alpha cells, slowing gastric emptying, and promoting satiety. These effects reduce post-meal blood sugar spikes and total caloric intake.`,
    commonProtocols: [
      {
        name: 'Diabetes Adjunct Protocol',
        description: 'Injected immediately before major meals (>250 kcal or >30g carbohydrate). Must reduce mealtime insulin doses by 50% when starting to prevent hypoglycemia. Titrate dose up over 3–7 days.',
        schedule: 'Subcutaneous injection immediately before each major meal',
        duration: 'Ongoing',
        startingDose: '15',
        maintenanceDose: '60',
        unit: 'mcg',
        frequency: 'daily',
      },
    ],
    safetyNotes: [
      'Nausea is the most common side effect, occurring in 30–50% of patients at initiation. Starting low and titrating slowly, and taking injections immediately before eating, substantially reduces nausea.',
      'Hypoglycemia risk is significantly increased when pramlintide is added to insulin regimens — the 50% mealtime insulin dose reduction at initiation is mandatory, not optional. Pramlintide and insulin must never be mixed in the same syringe.',
    ],
    stackingInfo: `Pramlintide is used alongside insulin in diabetes management. Research interest exists in combining pramlintide with GLP-1 agonists for synergistic weight management (the two compounds have complementary satiety mechanisms), but clinical trials have shown mixed tolerability due to combined GI side effects. Cannot be mixed in the same syringe as insulin.`,
    storageDetail: `Refrigerate at 2–8°C unopened. Opened vials: store in refrigerator or at room temperature up to 28 days. Do not freeze. Do not mix with insulin in the same syringe.`,
    researchStatus: `FDA-approved as Symlin for type 1 and type 2 diabetes adjunct to insulin (2005). Generic pramlintide approved. Research ongoing for weight management in non-diabetic obesity and as part of combination anti-obesity regimens.`,
    references: [
      {
        title: 'Pramlintide as an adjunct to insulin therapy improves long-term glycemic and weight control in patients with type 2 diabetes',
        source: 'Diabetes Care',
        year: 2001,
      },
    ],
    faqs: [
      {
        question: 'Can pramlintide be used for weight loss without diabetes?',
        answer: 'Pramlintide has been studied for obesity in non-diabetic individuals and does produce modest weight loss (~2–3 kg) through its satiety and gastric-slowing effects. However, the frequent injections (before each meal) and nausea side effects make it impractical compared to once-weekly GLP-1 agonists that produce far greater weight loss. It is not FDA-approved for obesity.',
      },
    ],
  },

  'glucagon': {
    compoundId: 'glucagon',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nGlucagon is a 29-amino-acid peptide hormone produced by alpha cells of the pancreas that raises blood glucose — it is the principal counter-regulatory hormone to insulin. When blood sugar falls too low (hypoglycemia), glucagon signals the liver to break down glycogen into glucose (glycogenolysis) and produce new glucose (gluconeogenesis), restoring blood sugar. Pharmaceutical glucagon is FDA-approved for emergency treatment of severe hypoglycemia in insulin-dependent diabetics. Modern formulations include nasal powder (Baqsimi) and autoinjector kits (Gvoke, Xeris Glucagon) that are simpler to use in emergencies than the older reconstitution kits. In hospital settings, glucagon is used to treat calcium-channel blocker and beta-blocker overdoses (it can overcome the cardiac depression from these drugs), as well as to relax gastrointestinal smooth muscle during endoscopic procedures. It does not have a role in routine wellness or body composition protocols; its emergency use purpose defines its practical application.`,
    mechanismDetail: `Glucagon binds the glucagon receptor (GCGR), a G-protein coupled receptor coupled to Gs/cAMP, primarily in the liver. cAMP/PKA activation phosphorylates glycogen phosphorylase (activating glycogenolysis) and inhibits glycogen synthase, releasing stored glucose. PKA also activates gluconeogenic enzymes. In adipose tissue, glucagon stimulates lipolysis. Cardiac GCGR activation increases heart rate and contractility — the mechanism exploited in overdose management. Glucagon is also the third receptor target of the investigational triple agonist retatrutide.`,
    commonProtocols: [
      {
        name: 'Emergency Hypoglycemia Treatment',
        description: 'For acute severe hypoglycemia in a person who cannot swallow and cannot self-administer glucose. Bystanders or caregivers administer. Call emergency services simultaneously.',
        schedule: 'Single dose, emergency use only — not a scheduled protocol',
        duration: 'Single emergency use',
        startingDose: '1',
        maintenanceDose: '1',
        unit: 'mg',
        frequency: 'weekly',
      },
    ],
    safetyNotes: [
      'Glucagon is an emergency medication, not a performance or wellness compound. It is ineffective in individuals with glycogen depletion (severe starvation, prolonged hypoglycemia) because it acts by mobilizing glycogen stores.',
      'Nausea and vomiting are common after glucagon administration — position the person on their side after administration to prevent aspiration if they vomit while unconscious.',
    ],
    stackingInfo: `Not applicable as a stackable compound — glucagon is an emergency rescue medication. In its triple agonist form as part of retatrutide, glucagon receptor activity is one component of a metabolic therapy compound. The glucagon receptor's role in thermogenesis and fat oxidation is under active research for metabolic disease applications.`,
    storageDetail: `Emergency kits: store at room temperature or refrigerate as specified per product. Baqsimi nasal powder: room temperature (20–25°C), protect from moisture. Most glucagon products have a 24-month shelf life — check expiration dates on emergency kits regularly.`,
    researchStatus: `FDA-approved in multiple formulations for emergency hypoglycemia. Nasal glucagon (Baqsimi) approved 2019. Stable glucagon formulations (Gvoke, Xeris) approved 2019. Active research as part of triple GLP-1/GIP/glucagon agonists (retatrutide) for metabolic disease.`,
    references: [
      {
        title: 'Nasal glucagon for the treatment of hypoglycemia in adults with type 1 diabetes: a randomized crossover noninferiority study',
        source: 'Diabetes Care',
        year: 2016,
      },
    ],
    faqs: [
      {
        question: 'Why would glucagon be in a peptide tracking app?',
        answer: 'Glucagon appears in PepMax because it is a peptide hormone, and some users managing diabetes may use it for hypoglycemia emergencies or as part of a hybrid closed-loop insulin pump system. Additionally, glucagon receptor agonism is one component of the emerging triple-agonist weight-loss drugs (like retatrutide), making it relevant context for users following those developments.',
      },
    ],
  },

  'bremelanotide': {
    compoundId: 'bremelanotide',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nBremelanotide is the FDA-approved pharmaceutical name for the compound often called PT-141 in research contexts. It is a melanocortin receptor agonist approved as Vyleesi for treating hypoactive sexual desire disorder (HSDD) in premenopausal women. It acts centrally in the brain — on MC3R and MC4R in the hypothalamus — to enhance sexual desire and arousal, making it mechanistically distinct from genital blood-flow agents like PDE5 inhibitors. The Vyleesi formulation is an autoinjector pen delivering 1.75 mg subcutaneously on demand, 45 minutes before anticipated sexual activity. The FDA approval was based on two pivotal RECONNECT trials showing statistically significant improvements in desire and reduction in distress related to low sexual desire. See also the PT-141 entry in this database for research compound context and broader use in men and women at various doses.`,
    mechanismDetail: `Bremelanotide activates melanocortin MC3R and MC4R receptors in the hypothalamus and limbic system. MC4R in the paraventricular nucleus is specifically implicated in pro-sexual signaling pathways. The peptide's central nervous system action increases dopamine and serotonin activity in arousal circuits. Half-life is approximately 2–3 hours after subcutaneous injection. Unlike PDE5 inhibitors, it does not require sexual stimulation to be present at the time of dosing — it modifies the brain's readiness for desire.`,
    commonProtocols: [
      {
        name: 'FDA-Approved On-Demand Protocol (Vyleesi)',
        description: 'Standard approved use in premenopausal women with HSDD. Single fixed dose per event, maximum one dose per 24 hours, and no more than one dose per anticipated sexual activity event.',
        schedule: 'On demand, 45 minutes before sexual activity, maximum 1 dose per 24 hours',
        duration: 'As needed, ongoing',
        startingDose: '1.75',
        maintenanceDose: '1.75',
        unit: 'mg',
        frequency: 'weekly',
      },
    ],
    safetyNotes: [
      'Nausea occurs in approximately 40% of patients after the first dose and in a smaller percentage with repeated use. An antiemetic can be taken 1 hour before if nausea is anticipated based on prior experience.',
      'Transient hyperpigmentation (face, gums, breasts) has been reported with frequent use — particularly in people with darker skin tones. This is reversible upon discontinuation.',
      'Blood pressure changes (transient decrease then mild increase) occur in the hour post-injection. Avoid use if you have uncontrolled hypertension or take antihypertensive drugs without medical guidance.',
    ],
    stackingInfo: `Not typically stacked with other compounds. Some providers combine with systemic hormonal optimization (testosterone, estrogen, DHEA) for comprehensive female sexual dysfunction management. The combination with PDE5 inhibitors for male sexual dysfunction is used off-label under medical supervision. Should not be combined with Melanotan II (same receptor class, redundant activity, additive side effects).`,
    storageDetail: `Vyleesi autoinjector: store at room temperature 20–25°C. Do not refrigerate the device once in active use. Protect from light. Use within 12 months of dispensing. Each device is single-use.`,
    researchStatus: `FDA-approved for HSDD in premenopausal women (Vyleesi, 2019). Off-label use (as compounded PT-141) is widespread in both sexes at various doses. Active research in male sexual dysfunction, postmenopausal HSDD, and broader sexual dysfunction etiologies.`,
    references: [
      {
        title: 'Bremelanotide for HSDD in Premenopausal Women — Two Randomized Phase 3 Trials (RECONNECT)',
        source: 'Obstetrics & Gynecology',
        year: 2019,
      },
    ],
    faqs: [
      {
        question: 'Is bremelanotide approved for men?',
        answer: 'No — the Vyleesi approval is specific to premenopausal women with HSDD. Compounded PT-141 (bremelanotide) is used off-label in men for erectile dysfunction and sexual desire enhancement, particularly men who are non-responsive to PDE5 inhibitors. This off-label use is not FDA-approved and falls under the PT-141 research compound category.',
      },
    ],
  },

  'setmelanotide': {
    compoundId: 'setmelanotide',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nSetmelanotide (brand name Imcivree) is an MC4R agonist — a melanocortin-4 receptor agonist — FDA-approved for treating severe obesity caused by specific genetic deficiencies in the leptin-melanocortin pathway. These rare genetic conditions include POMC (pro-opiomelanocortin) deficiency, PCSK1 deficiency, and LEPR (leptin receptor) deficiency. In these patients, the normal brain signaling pathway that controls appetite and energy expenditure through MC4R is broken, leading to extreme, treatment-resistant obesity from early childhood. By directly activating MC4R, setmelanotide bypasses the broken pathway and restores satiety signaling. It produces remarkable weight loss in this specific population — average of 25%+ body weight in trials. It is not approved for and does not work effectively in common obesity (where the MC4R pathway is intact and may already be maximally activated). This is a highly targeted, genetically-indicated therapy.`,
    mechanismDetail: `Setmelanotide is a highly selective MC4R agonist (8-amino-acid cyclic peptide) with minimal activity at MC1R, MC3R, and MC5R — avoiding the pigmentation and sexual function effects seen with less selective melanocortin agonists like MT-2. MC4R activation in the hypothalamic paraventricular nucleus reduces food intake and increases energy expenditure. In people with POMC, PCSK1, or LEPR deficiency, endogenous production of alpha-MSH (the natural MC4R agonist) is impaired; setmelanotide acts as a replacement to restore this lost signaling.`,
    commonProtocols: [
      {
        name: 'Genetically-Indicated Obesity Treatment',
        description: 'For FDA-approved genetic indications only. Requires genetic testing confirmation of eligible pathway deficiency. Dose is titrated monthly. Only appropriate for patients confirmed to have eligible genetic variants through approved diagnostic testing.',
        schedule: 'Daily subcutaneous injection, dose titrated monthly',
        duration: 'Ongoing',
        startingDose: '1',
        maintenanceDose: '3',
        unit: 'mg',
        frequency: 'daily',
      },
    ],
    safetyNotes: [
      'Hyperpigmentation (skin darkening, new or darkened nevi) occurs in virtually all patients due to residual MC1R activity — annual dermatological monitoring for new or changing moles is required.',
      'Setmelanotide is only appropriate for the specific genetic obesity syndromes it is approved for. It does not produce meaningful weight loss in common obesity and should not be used as a general weight management tool.',
    ],
    stackingInfo: `Not applicable for stacking in wellness contexts — setmelanotide is a targeted therapy for rare genetic disease, administered under specialist supervision. Its exclusive MC4R selectivity distinguishes it from other melanocortin compounds.`,
    storageDetail: `Refrigerate at 2–8°C. Do not freeze. Protect from light. The Imcivree vials contain 10 mg/mL concentration; each kit includes insulin-type syringes for self-injection.`,
    researchStatus: `FDA-approved for POMC, PCSK1, and LEPR deficiency obesity in adults and children ≥6 years (Imcivree, 2020). Active research for Bardet-Biedl syndrome obesity (approved 2022 extension) and other hypothalamic obesity syndromes. The research pipeline includes other rare genetic obesity conditions.`,
    references: [
      {
        title: 'Setmelanotide, a melanocortin-4 receptor agonist, for heterozygous POMC, PCSK1, and LEPR deficiency obesity',
        source: 'New England Journal of Medicine',
        year: 2020,
      },
    ],
    faqs: [
      {
        question: 'Would setmelanotide work for regular obesity even though it\'s not approved for it?',
        answer: 'Clinical trial data suggests no — in people with intact MC4R signaling (the vast majority of people with obesity), setmelanotide does not produce significant weight loss. MC4R appears to already be appropriately stimulated in typical obesity, so adding an agonist does not change the signaling balance. This is why the drug is specifically targeted at people with broken upstream signals in the leptin-melanocortin pathway.',
      },
    ],
  },

  'afamelanotide': {
    compoundId: 'afamelanotide',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nAfamelanotide (brand name Scenesse) is a potent, long-acting synthetic analog of alpha-MSH that selectively activates MC1R — the melanocortin receptor on skin cells (melanocytes) that controls pigmentation. It is FDA-approved for erythropoietic protoporphyria (EPP), an extremely rare inherited condition where a defective enzyme causes accumulation of protoporphyrin IX, making patients' skin acutely and severely painful when exposed to light. By dramatically increasing melanin production in the skin, afamelanotide provides a "sunscreen from within" that reduces this phototoxic reaction, allowing EPP patients to tolerate normal light exposure and dramatically improving their quality of life. It is administered as a subcutaneous biodegradable implant (the size of a grain of rice, placed under the skin) every 2 months, providing sustained release for 60 days.`,
    mechanismDetail: `Afamelanotide contains a single amino acid change from native alpha-MSH (Nle4, D-Phe7 substitutions) that dramatically increases its MC1R binding affinity and extends its half-life. The subcutaneous implant slowly dissolves, releasing afamelanotide over approximately 60 days. MC1R activation in melanocytes triggers melanin synthesis (eumelanin — the brown/black form that provides UV protection), increasing skin pigmentation even without UV exposure. This melanin production occurs regardless of UV stimulus, creating photoprotection in EPP patients who otherwise cannot tolerate any light exposure.`,
    commonProtocols: [
      {
        name: 'EPP Treatment Protocol',
        description: 'Subcutaneous implant inserted by a healthcare provider before the high-sun season. Each implant lasts approximately 60 days. Insertion is performed under sterile conditions, typically in the abdominal wall or upper arm.',
        schedule: 'Every 60 days subcutaneous implant insertion, seasonally (before high-sun season)',
        duration: 'Ongoing, seasonal or year-round depending on EPP severity',
        startingDose: '16',
        maintenanceDose: '16',
        unit: 'mg',
        frequency: 'biweekly',
      },
    ],
    safetyNotes: [
      'Nausea and headache are the most common side effects, occurring transiently after implant insertion in ~30% of patients. These typically resolve within 1–2 weeks.',
      'Because afamelanotide increases melanin production, it darkens existing moles and can create new pigmented lesions. Annual full-body dermatological skin examination is recommended for all patients on afamelanotide.',
    ],
    stackingInfo: `Not applicable for performance or wellness stacking — afamelanotide is a specialized treatment for a rare disease administered by healthcare providers as a subcutaneous implant. The tanning effect is a side effect of its EPP indication, not a therapeutic goal for normal skin.`,
    storageDetail: `Implants are stored by pharmacies at 2–8°C. They are sterile, single-use devices not intended for self-storage or administration. Administered by a trained healthcare provider.`,
    researchStatus: `FDA-approved for erythropoietic protoporphyria (Scenesse, 2019). Previously approved in Europe (2014). Clinical trials ongoing for variegate porphyria, polymorphous light eruption, and solar urticaria. Research into its potential utility in melanoma photoprotection and vitiligo repigmentation is also ongoing.`,
    references: [
      {
        title: 'Afamelanotide for Erythropoietic Protoporphyria — Pivotal Phase 3 Trial',
        source: 'New England Journal of Medicine',
        year: 2015,
      },
    ],
    faqs: [
      {
        question: 'Is afamelanotide related to Melanotan II?',
        answer: 'Both are melanocortin agonists derived from alpha-MSH modifications, and both were developed partially for their tanning effects. Afamelanotide is MC1R-selective and developed into an FDA-approved drug for a specific rare disease. Melanotan II is a non-selective melanocortin agonist (hitting MC1R through MC5R) that was never approved for any indication. Afamelanotide represents the legitimate pharmaceutical development path; Melanotan II represents the unapproved research/gray-market path.',
      },
    ],
  },

  'll-37': {
    compoundId: 'll-37',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nLL-37 is the only human cathelicidin antimicrobial peptide — a 37-amino-acid peptide derived from the precursor protein hCAP-18. It is part of the innate immune system's first line of defense, produced by neutrophils, epithelial cells, and other immune cells in response to infection or injury. LL-37 has broad-spectrum antimicrobial activity against bacteria, viruses, and fungi by disrupting their cell membranes. Beyond direct antimicrobial effects, LL-37 modulates immune responses, promotes wound healing, and has anti-inflammatory properties at certain concentrations. In the research community, LL-37 is explored for treating antibiotic-resistant infections (where its non-receptor-based membrane-disruption mechanism is valuable), wound healing, and potentially for its immune-modulating effects in autoimmune conditions. Low LL-37 levels have been associated with increased susceptibility to infections like tuberculosis.`,
    mechanismDetail: `LL-37 disrupts bacterial membranes by adopting an alpha-helical structure that intercalates into lipid bilayers, forming pores or causing membrane dissolution — a mechanism that does not require specific receptors, making antimicrobial resistance less likely to develop against it. It also activates toll-like receptors (TLR4), P2X7 receptors, and formyl peptide receptor 2 (FPR2) on immune cells, triggering cytokine production and immune cell recruitment. At low concentrations, it enhances immune responses; at high concentrations, it can have anti-inflammatory effects by neutralizing LPS (bacterial endotoxin). Vitamin D signaling upregulates LL-37 production — the mechanism linking low vitamin D to increased infection risk.`,
    commonProtocols: [
      {
        name: 'Immune Support Injection Protocol',
        description: 'Subcutaneous injection protocol used by some practitioners for immune modulation and support. Combined with Thymosin Alpha-1 in some protocols for synergistic immune effects.',
        schedule: 'Two to three times weekly subcutaneous injection',
        duration: '4–8 week cycles',
        startingDose: '100',
        maintenanceDose: '200',
        unit: 'mcg',
        frequency: '3xWeek',
      },
    ],
    safetyNotes: [
      'LL-37 can cause significant inflammation and cell toxicity at high concentrations — the same membrane-disruption mechanism that kills bacteria can damage mammalian cells at excessive doses. Dosing precision matters.',
      'Injection-site pain and redness are common. LL-37\'s membrane activity means it may cause local inflammatory reactions more than other peptides. Start at very low doses.',
    ],
    stackingInfo: `Often combined with Thymosin Alpha-1 in immune optimization protocols for synergistic innate and adaptive immune stimulation. Some naturopathic and functional medicine providers add LL-37 to comprehensive infection-management protocols alongside NAC, vitamin D, and zinc.`,
    storageDetail: `Lyophilized: refrigerate at 2–8°C. Reconstituted: refrigerate, use within 14 days. LL-37 can self-aggregate — ensure proper dissolution before injection. May adsorb to plastic — some practitioners use glass syringes.`,
    researchStatus: `Not FDA-approved for any indication. Extensive in vitro and animal data on antimicrobial activity. Early-phase human studies ongoing for wound healing (topical applications) and respiratory infections. Active research into LL-37 in COVID-19 and sepsis. Multiple delivery formulations (topical, inhaled, injectable) being explored.`,
    references: [
      {
        title: 'The human cathelicidin LL-37 — a multifunctional peptide involved in infection and inflammation with potential future therapeutic or diagnostic applications',
        source: 'Critical Reviews in Microbiology',
        year: 2010,
      },
    ],
    faqs: [
      {
        question: 'What is LL-37 actually used for in a clinical or research setting?',
        answer: 'The most validated use cases being studied include topical application for non-healing chronic wounds, inhaled delivery for cystic fibrosis lung infections, and injectable immune support in immunocompromised patients. The Vitamin D–LL-37 connection also makes it a research target for understanding why vitamin D deficiency increases infection risk. Its potential as an alternative to traditional antibiotics for resistant bacteria is a major long-term research goal.',
      },
    ],
  },

  'selank': {
    compoundId: 'selank',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nSelank is a synthetic heptapeptide (7 amino acids: Thr-Lys-Pro-Arg-Pro-Gly-Pro) developed by the Institute of Molecular Genetics of the Russian Academy of Sciences as an anxiolytic (anti-anxiety) agent. It is approved in Russia for treatment of anxiety disorders and also marketed as a cognitive enhancer ("nootropic"). Selank is derived from Tuftsin — an endogenous tetrapeptide (Thr-Lys-Pro-Arg) that has immune-modulatory effects — with additional residues added to improve stability. It is available as both a nasal spray and injectable formulation. In animal studies and Russian clinical trials, selank has shown anxiolytic effects comparable to benzodiazepines without sedation, tolerance development, or addiction potential. It also appears to enhance memory consolidation and cognitive performance.`,
    mechanismDetail: `Selank increases expression of BDNF (brain-derived neurotrophic factor) and modulates the serotonin transporter system. It appears to stabilize enkephalins (endogenous opioid peptides) by inhibiting enkephalinase enzymes, prolonging their anxiolytic effects. It also modulates GABA-A receptor sensitivity and interacts with the benzodiazepine binding site, though its mechanism is gentler than classical benzodiazepines. The immune-modulatory component (from Tuftsin) may contribute to its stability and additional effects on neuroinflammation.`,
    commonProtocols: [
      {
        name: 'Intranasal Anxiolytic Protocol',
        description: 'Most common delivery method: nasal spray delivers selank directly to the brain via olfactory pathway, providing rapid anxiolytic effect. Used as needed for acute anxiety or on a scheduled basis for generalized anxiety.',
        schedule: 'Intranasal spray 2–3 times daily (each nostril) as needed',
        duration: '2–4 week courses, then break; or as-needed',
        startingDose: '250',
        maintenanceDose: '300',
        unit: 'mcg',
        frequency: 'daily',
      },
    ],
    safetyNotes: [
      'Selank has a favorable safety profile in Russian clinical studies — no significant sedation, no respiratory depression, no reported dependency or withdrawal, and no reported serious adverse effects at therapeutic doses.',
      'Very limited data exists from Western regulatory-standard clinical trials. The Russian evidence base, while substantive, may not meet FDA evidentiary standards. Use with appropriate uncertainty about long-term safety.',
    ],
    stackingInfo: `Selank is sometimes combined with its sibling compound Semax in nootropic stacks for combined anxiolytic + cognitive enhancement effects. It may complement adaptogenic herbs (ashwagandha, rhodiola) in stress management protocols. Avoid combining with other GABA-modulating drugs (benzodiazepines, alcohol, barbiturates) without medical supervision.`,
    storageDetail: `Nasal spray vials: refrigerate at 2–8°C. Lyophilized injectable: refrigerate. Both forms are relatively stable but should be used within the manufacturer's specified window (typically 2–4 weeks after opening). Protect from light.`,
    researchStatus: `Approved in Russia for generalized anxiety disorder. Not FDA-approved. Russian regulatory approval based on domestic clinical trials. Limited peer-reviewed evidence available in Western journals. Research compound in the West. Used as nootropic/anxiolytic in self-optimization communities.`,
    references: [
      {
        title: 'Selank: clinical and psychophysiological aspects of use in anxiety disorders',
        source: 'Zhurnal Nevrologii i Psikhiatrii',
        year: 2008,
      },
    ],
    faqs: [
      {
        question: 'How does Selank compare to traditional anti-anxiety medications?',
        answer: 'Selank produces anxiolytic effects without the sedation, cognitive impairment, or addiction potential of benzodiazepines. Russian clinical studies suggest comparable anxiolytic efficacy to benzodiazepines for generalized anxiety. Unlike SSRIs, selank works acutely (within minutes when given intranasally) rather than requiring weeks to build effect. It lacks the robust Western RCT evidence base of approved anxiolytics, which limits how much confidence can be placed in these comparisons.',
      },
    ],
  },

  'semax': {
    compoundId: 'semax',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nSemax is a synthetic heptapeptide (Met-Glu-His-Phe-Pro-Gly-Pro) derived from ACTH(4-10) — a fragment of the adrenocorticotropic hormone. It was developed in Russia and is approved there as a nootropic and neuroprotective agent. Unlike full ACTH, Semax does not stimulate cortisol production — it retains only the neuroactive properties of the ACTH fragment. Semax increases BDNF (brain-derived neurotrophic factor) expression significantly, which is why it is studied for neuroprotection, cognitive enhancement, and recovery from neurological injury. It has been used clinically in Russia for stroke, traumatic brain injury, optic nerve damage, and cognitive decline. It is available primarily as a nasal spray for rapid CNS delivery via the olfactory pathway.`,
    mechanismDetail: `Semax binds to melanocortin receptors in the brain and modulates the serotonin and dopamine systems. Most significantly, it dramatically upregulates BDNF and VEGF expression in the hippocampus and cortex, promoting neuroplasticity, neuroprotection, and new neuron growth. It also activates the immune component of the nervous system (microglia and astrocytes) in a protective manner. Its ACTH(4-10) core fragment interacts with melanocortin MC4R and MC5R in the CNS without peripheral ACTH receptor activity (hence no cortisol stimulation).`,
    commonProtocols: [
      {
        name: 'Cognitive Enhancement / Neuroprotection Protocol',
        description: 'Intranasal spray protocol for cognitive performance and neuroprotection. Rapid CNS delivery via olfactory epithelium. Used cyclically — typically 10–14 day courses.',
        schedule: 'Intranasal spray twice daily (each nostril), morning and midday',
        duration: '10–14 day courses with equal breaks',
        startingDose: '300',
        maintenanceDose: '600',
        unit: 'mcg',
        frequency: 'daily',
      },
    ],
    safetyNotes: [
      'Semax stimulates dopamine and serotonin systems — while generally well-tolerated, individuals with bipolar disorder, schizophrenia, or other psychotic conditions should avoid use without psychiatric supervision, as dopaminergic stimulation can be destabilizing.',
      'Mild nasal irritation and transient headache are the most common reported effects with the nasal spray formulation. These typically resolve after the first few days of use.',
    ],
    stackingInfo: `Semax and Selank are often combined as a synergistic nootropic stack — Semax for cognitive enhancement (BDNF, dopamine, serotonin) and Selank for anxiolytic effects. This combination is popular in biohacking communities. Semax may also complement racetam nootropics (piracetam, aniracetam) through complementary mechanisms.`,
    storageDetail: `Nasal spray vials: refrigerate at 2–8°C. Stable for approximately 1 month after opening when refrigerated. Keep away from heat and light. The nasal spray formulation degrades faster than lyophilized forms if not refrigerated.`,
    researchStatus: `Approved in Russia for cerebrovascular conditions, stroke recovery, and cognitive enhancement. Not FDA-approved. Limited Western RCT evidence. Used as research compound and nootropic in the West. Active research interest in BDNF-related applications.`,
    references: [
      {
        title: 'Semax, an analogue of ACTH(4-10) with cognitive effects: review of pharmacology and clinical studies',
        source: 'Russian Journal of Bioorganic Chemistry',
        year: 2007,
      },
    ],
    faqs: [
      {
        question: 'Does Semax actually improve memory and cognitive function?',
        answer: 'In the Russian clinical literature, Semax has demonstrated improvements in attention, memory, and processing speed in stroke patients and healthy adults. Its BDNF-upregulating mechanism has a strong scientific rationale for neuroprotection and cognitive enhancement. Western researchers are interested but independent replication in large RCTs is lacking. Individual responses appear variable.',
      },
    ],
  },

  'dihexa': {
    compoundId: 'dihexa',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nDihexa (PNB-0408, N-hexanoic-Tyr-Ile-(6) aminohexanoic amide) is a small peptide derived from Angiotensin IV — a fragment of the renin-angiotensin system normally associated with blood pressure regulation but also active in the brain, where it promotes memory and cognitive function via the AT4 receptor. Dihexa was developed at Washington State University as a potent cognitive enhancer. In animal studies, dihexa demonstrated cognitive improvements millions of times more potent than BDNF (brain-derived neurotrophic factor) itself, and it restored cognitive function in animal models of Alzheimer's disease. It works by potentiating hepatocyte growth factor (HGF) signaling at the MET receptor, which promotes synaptogenesis (formation of new synaptic connections) in the brain. There are no published human clinical trials, and it exists only as a research compound.`,
    mechanismDetail: `Dihexa binds to HGF (hepatocyte growth factor) and potentiates its activation of the MET receptor tyrosine kinase. MET/HGF signaling in neurons promotes dendritic branching, synaptogenesis, and neuroprotection. Dihexa effectively acts as a "super-potentiator" of the endogenous HGF/MET signaling that supports cognitive function. It crosses the blood-brain barrier after oral or transdermal administration, making it orally and topically active (unusual for peptides). The AT4 receptor also plays a role in its memory-enhancing effects via insulin-regulated aminopeptidase (IRAP) inhibition, which prolongs neuropeptide signaling in memory circuits.`,
    commonProtocols: [
      {
        name: 'Research Cognitive Enhancement Protocol',
        description: 'Oral or transdermal delivery. Very low doses appear to be active due to extreme potency. No validated human dose exists — these are extrapolated from animal data and anecdotal reports.',
        schedule: 'Oral or topical application, once daily',
        duration: '4–8 week cycles',
        startingDose: '10',
        maintenanceDose: '30',
        unit: 'mg',
        frequency: 'daily',
      },
    ],
    safetyNotes: [
      'No human safety or efficacy data from clinical trials exists. All evidence is from animal studies and anecdotal self-experimentation. The complete safety profile in humans is unknown.',
      'Because dihexa stimulates synaptogenesis and synaptic signaling so potently, theoretical concerns exist about overstimulation of neural circuits — potential for seizure activity at high doses has been raised by researchers, though this has not been systematically studied in humans.',
    ],
    stackingInfo: `Dihexa is sometimes combined with other nootropics (semax, selank, racetams) in cognitive enhancement protocols. Given its unknown human safety profile and extreme potency in animal models, extreme caution with dosing and combination is warranted.`,
    storageDetail: `Stored at room temperature or refrigerated as lyophilized powder or oral solution. More stable than most peptides due to its small, modified structure. Protect from UV light and excessive heat.`,
    researchStatus: `Not FDA-approved. No published human clinical trials. Research compound only. Developed at Washington State University — original research published in Journal of Neurochemistry (2013). Extremely early-stage in human applicability. Strong animal data but significant translational uncertainty.`,
    references: [
      {
        title: 'A small molecule angiotensin IV analog rescues memory deficits in multiple models of Alzheimer\'s disease',
        source: 'Journal of Neurochemistry',
        year: 2013,
      },
    ],
    faqs: [
      {
        question: 'How potent is dihexa compared to other nootropic peptides?',
        answer: 'In animal studies, dihexa produced cognitive improvements at concentrations millions of times lower than BDNF — this extraordinary potency makes it one of the most intriguing cognitive compounds from a mechanism standpoint, but also makes dose calibration in humans extremely uncertain. No one knows what the equivalent human therapeutic dose is, which is one of the main reasons human trials have not been widely initiated.',
      },
    ],
  },

  'dsip-delta-sleep-inducing-peptide': {
    compoundId: 'dsip-delta-sleep-inducing-peptide',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nDSIP (Delta Sleep-Inducing Peptide) is a naturally occurring nonapeptide (9 amino acids) originally isolated from the cerebral venous blood of rabbits during induced slow-wave (delta) sleep in 1974. It was initially proposed to be a sleep-regulating neuropeptide that promotes deep, restorative (delta wave) sleep. Subsequent research has been mixed — some studies confirm sleep-promoting effects while others have not replicated them. DSIP has also been studied for its analgesic (pain-reducing), anti-stress, and antioxidant properties, and has shown some evidence of reducing withdrawal symptoms in opioid and alcohol dependence. It is used in the research community primarily for sleep optimization and stress response modulation. A specific receptor for DSIP has not been definitively identified, complicating mechanistic understanding.`,
    mechanismDetail: `DSIP's precise mechanism remains incompletely characterized, unlike most other peptides in this database. It modulates GABA-B receptors and appears to interact with the somatostatin system, which suppresses ACTH and GH secretion (reducing stress hormonal responses). It may act on the circadian rhythm system (suprachiasmatic nucleus) to phase-shift or entrain sleep timing. It reduces oxidative stress in animal models through unknown mechanisms. The lack of a clearly identified receptor makes DSIP mechanistically enigmatic compared to other neuropeptides.`,
    commonProtocols: [
      {
        name: 'Sleep Optimization Protocol',
        description: 'Subcutaneous injection before sleep. Effects, when reported, include deeper sleep stages and more refreshing sleep. Effects are subtle and take several days of consecutive use to manifest.',
        schedule: 'Subcutaneous injection 30–60 minutes before bedtime',
        duration: '5–10 day courses, cyclically',
        startingDose: '100',
        maintenanceDose: '200',
        unit: 'mcg',
        frequency: 'daily',
      },
    ],
    safetyNotes: [
      'DSIP has shown an excellent safety profile in animal studies and the limited human research that exists — no serious adverse effects have been reported.',
      'Efficacy is inconsistent across studies and individuals — some users report significant sleep improvement while others report nothing. The evidence base for reliable human efficacy is weaker than for most peptides in this database.',
    ],
    stackingInfo: `DSIP is sometimes combined with MK-677 (ibutamoren) in sleep optimization stacks for potentially synergistic deep sleep enhancement. It may also complement magnesium glycinate and other sleep-support compounds. Its use alongside GHRH/GHRP protocols (which also improve sleep quality) may be redundant but has not been specifically studied.`,
    storageDetail: `Lyophilized: refrigerate at 2–8°C. Reconstituted with bacteriostatic water: refrigerate, use within 14 days. Relatively stable small peptide. Protect from UV light.`,
    researchStatus: `Not FDA-approved. Research compound. Discovered in 1974; studied primarily in the 1980s–1990s. Limited modern RCT data. Interest has been renewed in sleep medicine research. Some small human studies exist with mixed results. Primarily used in compounding peptide protocols for sleep.`,
    references: [
      {
        title: 'Delta sleep-inducing peptide (DSIP): an overview of central actions and possible mechanisms of action',
        source: 'European Journal of Pharmacology',
        year: 1994,
      },
    ],
    faqs: [
      {
        question: 'Is DSIP reliably effective for sleep?',
        answer: 'Honestly, the evidence is mixed. Some human studies show improvements in sleep quality and delta wave activity; others show minimal effect. Individual responses vary considerably. It is considered one of the more experimental compounds in the sleep optimization space — reasonable to try given its safety profile, but not a guaranteed solution. MK-677 has a stronger evidence base for sleep quality improvement specifically through GH axis/deep sleep enhancement.',
      },
    ],
  },

  'oxytocin-compounded-wellness': {
    compoundId: 'oxytocin-compounded-wellness',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nOxytocin is a 9-amino-acid peptide hormone produced in the hypothalamus and released from the posterior pituitary. Known colloquially as the "love hormone" or "bonding hormone," it plays central roles in social bonding, trust, maternal behavior, pair bonding, sexual function, and stress reduction. Pharmaceutical oxytocin (Pitocin) is FDA-approved as an injectable for labor induction, postpartum hemorrhage, and milk letdown stimulation. Compounded intranasal oxytocin has been extensively studied (and used) for autism spectrum disorder, social anxiety, PTSD, and relationship/bonding enhancement — despite the FDA not having approved an intranasal oxytocin formulation. The compounded wellness use of intranasal oxytocin has grown substantially in functional medicine, couples therapy, and trauma treatment settings, based on a large body of research showing acute improvements in trust, empathy, and social cognition.`,
    mechanismDetail: `Oxytocin binds oxytocin receptors (OTR), G-protein coupled receptors expressed widely in the brain (especially amygdala, hypothalamus, nucleus accumbens) and in peripheral tissues (uterus, breasts, heart, gut). In the brain, OTR activation in the amygdala reduces fear responses, increases trust and prosocial behavior, and modulates the HPA (stress) axis. Dopamine and serotonin interactions mediate reward and bonding behaviors. Intranasal oxytocin enters the CNS partly via the olfactory pathway and partly via peripheral blood, though the relative contribution of direct CNS delivery versus peripheral blood is debated. In the periphery, it stimulates uterine contractions, milk letdown, and has anti-inflammatory effects.`,
    commonProtocols: [
      {
        name: 'Intranasal Social/Wellness Protocol',
        description: 'Most common compounded wellness application. Intranasal spray used situationally (before therapy, social events) or on a scheduled basis. Onset is 15–45 minutes. Effects last 1–2 hours.',
        schedule: 'Intranasal spray as needed or scheduled twice daily',
        duration: 'Situational or cyclical (e.g., Monday–Friday, weekends off)',
        startingDose: '16',
        maintenanceDose: '24',
        unit: 'IU',
        frequency: 'daily',
      },
    ],
    safetyNotes: [
      'Oxytocin is generally well-tolerated in intranasal doses used in research. Headache, nausea, and uterine cramping (in women) are occasionally reported. At high doses, water retention can occur because oxytocin shares structural similarity with vasopressin (ADH).',
      'Oxytocin\'s social effects are context-dependent — while it increases in-group trust and bonding, some research suggests it can also increase out-group suspicion and competitive behavior. Its effects are not simply "more trust for everyone."',
    ],
    stackingInfo: `Intranasal oxytocin is sometimes combined with MDMA-assisted psychotherapy in clinical research settings (MAPS protocols) for enhanced therapeutic outcomes in PTSD. In relationship wellness contexts, it may complement couples therapy. In functional medicine, it is sometimes paired with low-dose naltrexone (LDN) for immune and social function benefits.`,
    storageDetail: `Compounded intranasal solutions: refrigerate at 2–8°C. Stable for approximately 30–60 days under refrigeration. Do not freeze. Protect from light. Pharmaceutical Pitocin injection: refrigerate, single-use vials.`,
    researchStatus: `Pharmaceutical oxytocin (Pitocin) FDA-approved for obstetric indications. Compounded intranasal oxytocin: not FDA-approved as finished drug product but widely used in research and functional medicine. Hundreds of published studies on intranasal oxytocin in social cognition, autism, PTSD, anxiety, and relationship health. FDA has considered regulating compounded intranasal oxytocin as a biological drug product, creating regulatory uncertainty.`,
    references: [
      {
        title: 'Oxytocin increases trust in humans',
        source: 'Nature',
        year: 2005,
      },
    ],
    faqs: [
      {
        question: 'Does intranasal oxytocin actually work for social anxiety and bonding?',
        answer: 'The research is more nuanced than popular media suggests. Many studies show acute effects on trust, fear reduction, and prosocial behavior in controlled settings. However, effects are often modest, highly context-dependent, and vary significantly between individuals based on baseline oxytocin levels, attachment style, and whether the social context is perceived as safe. Meta-analyses show a small but real effect. It is not a universal social enhancement pill.',
      },
    ],
  },

  '5-amino-1mq': {
    compoundId: '5-amino-1mq',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\n5-Amino-1MQ (5-amino-1-methylquinolinium) is a small molecule (technically not a peptide, but included in PepMax due to its use in metabolic optimization protocols alongside peptides) that acts as a potent inhibitor of NNMT (Nicotinamide N-methyltransferase). NNMT is an enzyme that consumes SAM (S-adenosylmethionine — a key methyl donor) and NAD+ precursors, effectively depleting the cell's supply of these important metabolic cofactors. By inhibiting NNMT, 5-Amino-1MQ increases intracellular NAD+ levels and activates SIRT1 (a NAD+-dependent deacetylase linked to longevity and metabolic health). It has been studied primarily in the context of obesity and metabolic disease in animal models, where it prevented diet-induced obesity and improved lipid metabolism. It is sold as a research compound and is not FDA-approved for any indication.`,
    mechanismDetail: `NNMT catalyzes the N-methylation of nicotinamide (vitamin B3) using SAM as the methyl donor, producing 1-methylnicotinamide. By consuming NAD+ precursors and SAM, NNMT effectively reduces cellular NAD+ availability and methyl group availability. 5-Amino-1MQ competitively inhibits NNMT, preserving NAD+ precursor pools and SAM. The resulting increase in NAD+ activates sirtuins (SIRT1, SIRT3), PARP enzymes, and other NAD+-dependent metabolic regulators. SIRT1 activation specifically deacetylates PGC-1α, stimulating mitochondrial biogenesis and fat oxidation — similar mechanisms to caloric restriction and exercise.`,
    commonProtocols: [
      {
        name: 'Metabolic Optimization Protocol',
        description: 'Oral capsule protocol based on doses used in preclinical studies scaled to human equivalents. Taken with a meal to improve tolerability. Often combined with NMN or NR (NAD+ precursors) for synergistic NAD+ elevation.',
        schedule: 'Oral, once or twice daily with meals',
        duration: 'Ongoing cycles; reassess every 8–12 weeks',
        startingDose: '50',
        maintenanceDose: '100',
        unit: 'mg',
        frequency: 'daily',
      },
    ],
    safetyNotes: [
      'No human clinical trial safety data exists for 5-Amino-1MQ. All safety information is from animal studies and limited anecdotal human reports. Treat as an investigational compound with unknown human safety profile.',
      'Because NNMT has roles in cancer biology (some tumors upregulate NNMT for metabolic advantages), NNMT inhibition has complex implications — it may have anti-cancer properties or, in certain cancer types, unpredictable effects. People with active cancer should not use this compound without oncology input.',
    ],
    stackingInfo: `5-Amino-1MQ is frequently stacked with NMN (nicotinamide mononucleotide) or NR (nicotinamide riboside) — NNMT inhibition + NAD+ precursor supplementation creates a dual approach to maximizing cellular NAD+ levels. This combination with NAD+ precursors is popular in longevity-focused protocols. It may complement metformin and MOTS-c given their shared AMPK activation themes.`,
    storageDetail: `Oral capsules or powder: room temperature, away from moisture and light. Does not require refrigeration. Relatively stable small molecule with good shelf life at room temperature.`,
    researchStatus: `Not FDA-approved. Research compound only. Key animal research published by Kraus et al. (Nature Communications, 2014) established the foundational evidence for NNMT inhibition in obesity. No published human clinical trials as of 2024–2025. Commercially available as research compound through several suppliers.`,
    references: [
      {
        title: 'Nicotinamide N-methyltransferase knockdown protects against diet-induced obesity',
        source: 'Nature',
        year: 2014,
      },
    ],
    faqs: [
      {
        question: 'How is 5-Amino-1MQ different from just taking NMN or NR?',
        answer: 'NMN and NR supply the raw material (NAD+ precursors) for cells to make more NAD+. 5-Amino-1MQ stops the enzyme that wastes those precursors. Think of NMN/NR as putting more fuel in the tank, while 5-Amino-1MQ plugs the leak. Combining both approaches theoretically maximizes the NAD+ available to cells — which is why they are often stacked together. However, both approaches have limited human clinical trial data supporting their effects on longevity or performance outcomes.',
      },
    ],
  },

  'leuprolide': {
    compoundId: 'leuprolide',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nLeuprolide (brand names Lupron, Eligard) is a synthetic GnRH (gonadotropin-releasing hormone) agonist — a 9-amino-acid peptide analog of the natural GnRH. In a counterintuitive way, continuous stimulation of the GnRH receptor (unlike the natural pulsatile GnRH release) eventually desensitizes and downregulates the receptor, suppressing the pituitary's production of LH and FSH and ultimately reducing sex hormone production (testosterone in men, estrogen in women) to castrate levels. This "chemical castration" effect makes leuprolide a cornerstone treatment for hormone-sensitive cancers: prostate cancer in men, and endometriosis, uterine fibroids, and certain breast cancers in women. It is also used in pediatric precocious puberty (to delay premature puberty) and in transgender hormone therapy protocols. In men, leuprolide creates profound testosterone suppression — a completely opposite use case from typical peptide optimization protocols.`,
    mechanismDetail: `Natural GnRH is released in pulses every 60–90 minutes from the hypothalamus. Pulsatile GnRH stimulates GnRH receptors (GnRHR) on pituitary gonadotrophs, producing LH and FSH surges. Leuprolide, when given continuously (via depot injection or implant), provides non-pulsatile constant GnRHR stimulation. Within 1–2 weeks, this causes receptor downregulation and desensitization — GnRHR expression drops, LH and FSH production falls, and gonadal sex hormone production collapses to castrate levels. The initial stimulation before downregulation causes a brief testosterone surge (tumor flare) of 1–2 weeks in prostate cancer patients, which is clinically significant and requires management with an antiandrogen drug.`,
    commonProtocols: [
      {
        name: 'Oncology/Medical Suppression Protocol',
        description: 'Standard depot injection for prostate cancer, endometriosis, or fibroids. Multiple depot durations are available (1-month, 3-month, 4-month, 6-month formulations). Dose selection is indication-specific.',
        schedule: 'Depot injection once monthly (7.5 mg) or every 3 months (22.5 mg) or every 6 months (45 mg)',
        duration: 'Ongoing for cancer suppression; limited courses for endometriosis (6 months) or fibroids',
        startingDose: '7.5',
        maintenanceDose: '22.5',
        unit: 'mg',
        frequency: 'monthly',
      },
    ],
    safetyNotes: [
      'Testosterone/estrogen suppression causes significant side effects: hot flashes, bone density loss (osteoporosis with long-term use), loss of libido, sexual dysfunction, fatigue, mood changes, and cognitive effects. These are expected on-target effects of complete sex hormone suppression.',
      'Tumor flare (brief testosterone surge in the first 1–2 weeks of leuprolide in prostate cancer patients) can cause acute clinical worsening — bone pain, urinary obstruction. Antiandrogen therapy (bicalutamide) is used for the first 4 weeks to prevent this.',
    ],
    stackingInfo: `Leuprolide is used in combination with antiandrogen drugs (bicalutamide, enzalutamide) for prostate cancer — combined androgen blockade. In transgender medicine, it is used as puberty suppression in adolescents, typically bridging to gender-affirming hormone therapy. It is incompatible with testosterone optimization protocols as it is used specifically to eliminate testosterone. In some fertility protocols, it is used to time egg retrieval in IVF.`,
    storageDetail: `Depot microsphere kits: refrigerate at 2–8°C. Depot formulations should not be frozen. Implants: store per manufacturer instructions. Kits include specific diluent and syringe for reconstitution — use only the included components.`,
    researchStatus: `FDA-approved for multiple indications: advanced prostate cancer, endometriosis, uterine fibroids, central precocious puberty (Lupron, 1985+). Multiple depot formulations and durations approved. Generic leuprolide available. Biosimilar versions approved. Active in oncology research combined with novel antiandrogens.`,
    references: [
      {
        title: 'Leuprolide versus diethylstilbestrol for metastatic prostate cancer',
        source: 'New England Journal of Medicine',
        year: 1984,
      },
    ],
    faqs: [
      {
        question: 'Why would someone tracking peptides be using leuprolide?',
        answer: 'Leuprolide users include prostate cancer patients (the most common use), people with endometriosis or fibroids, and in some cases people in gender medicine protocols using puberty suppression. PepMax supports all people managing their health with injectable peptides and hormones, including those on suppressive hormone therapies. Tracking injection dates, depot durations, and medication cycles is just as valuable for leuprolide users as for anyone else.',
      },
    ],
  },

  'macimorelin': {
    compoundId: 'macimorelin',
    overview: `This information is for educational purposes only. Always consult a healthcare provider before starting any peptide protocol.\n\nMacimorelin (brand name Macrilen) is an oral growth hormone secretagogue — a small peptidomimetic molecule that activates the ghrelin receptor (GHS-R1a) to stimulate pituitary GH release. It is FDA-approved (2017) as a diagnostic test for adult growth hormone deficiency (AGHD). The test works by administering a single oral dose of macimorelin (0.5 mg/kg), which stimulates the pituitary to release GH; blood samples taken 45 and 90 minutes later measure the GH response. A peak GH level below 2.8 ng/mL is diagnostic for AGHD. Prior to macimorelin, the insulin tolerance test (ITT) was the gold standard for AGHD diagnosis, requiring insulin-induced hypoglycemia which carries risks — macimorelin provides a safer, orally-administered alternative. Macimorelin is used exclusively as a diagnostic tool, not for ongoing therapy.`,
    mechanismDetail: `Macimorelin is an indanylamine-based compound (peptidomimetic, not a true peptide) that binds GHS-R1a with high affinity, mimicking ghrelin's stimulation of pituitary GH secretion. As an oral agent, it provides a standardized, reproducible GH stimulation test. The pharmacokinetic profile allows blood sampling at defined time points for reliable GH peak measurement. Its GHS-R1a selectivity and oral bioavailability distinguish it from injectable GHRPs.`,
    commonProtocols: [
      {
        name: 'AGHD Diagnostic Test (FDA-Approved)',
        description: 'Single-dose oral test under medical supervision. Patient fasts overnight. A single dose is taken orally, and blood GH is measured at defined intervals. This is a medical test, not a therapeutic protocol.',
        schedule: 'Single oral dose as a diagnostic test, administered by healthcare provider',
        duration: 'Single-use diagnostic only',
        startingDose: '0.5',
        maintenanceDose: '0.5',
        unit: 'mg/kg',
        frequency: 'monthly',
      },
    ],
    safetyNotes: [
      'Macimorelin prolongs the QT interval (a measure of cardiac electrical activity) and should not be used in patients on medications that also prolong QT interval (certain antidepressants, antiarrhythmics, antibiotics). Baseline ECG is recommended before the test.',
      'Macimorelin is a diagnostic test compound, not a therapeutic compound. It should not be used repeatedly or as a GH stimulator for performance purposes — its FDA approval is specifically for the diagnostic context.',
    ],
    stackingInfo: `Not applicable for stacking — macimorelin is a single-use diagnostic compound used under medical supervision to test pituitary GH secretory capacity. It is not used in therapeutic or performance protocols.`,
    storageDetail: `Macrilen granules (oral solution): store at room temperature 20–25°C. The pouch containing granules should be opened and dissolved in water immediately before administration. Single-use pouches — no storage after reconstitution.`,
    researchStatus: `FDA-approved for adult growth hormone deficiency diagnosis (Macrilen, 2017). European approval for same indication. Replaced the insulin tolerance test as the preferred pharmacological GH stimulation test in many clinical settings due to superior safety profile. No therapeutic (ongoing) use approved.`,
    references: [
      {
        title: 'Macimorelin as a diagnostic test for adult GH deficiency — pivotal trial',
        source: 'Journal of Clinical Endocrinology & Metabolism',
        year: 2018,
      },
    ],
    faqs: [
      {
        question: 'Can macimorelin be used to boost GH like MK-677?',
        answer: 'While macimorelin and MK-677 share the same mechanism (GHS-R1a activation), macimorelin is approved only as a single-dose diagnostic test and has not been studied for ongoing therapeutic use. MK-677 was specifically developed and studied for continuous GH axis stimulation. Using macimorelin repeatedly as a GH booster is off-label, unsupported by evidence, and potentially unsafe due to its QT-prolonging effect.',
      },
    ],
  },
};

export function getEducation(compoundId: string): CompoundEducation | undefined {
  return COMPOUND_EDUCATION[compoundId];
}

export function hasEducation(compoundId: string): boolean {
  return compoundId in COMPOUND_EDUCATION;
}

export default COMPOUND_EDUCATION;
