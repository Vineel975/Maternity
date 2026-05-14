<img width="1239" height="601" alt="image" src="https://github.com/user-attachments/assets/acb69b99-1e87-4719-bd57-c6ff007ce56c" />


Type '"openrouter" | "anthropic" | "google"' is not assignable to type 'ModelProvider'.
  Type '"anthropic"' is not assignable to type 'ModelProvider'.

SPECTRA_BASE_URL = https://spectra-app-qa-v9.fhpl.net

STAGING_API_KEY = claimai-staging-key-2025

NEXT_PUBLIC_APP_URL = https://claims-helixview-uat.fhpl.net


ID	Level1	Level2	Level3
402	Obstetrics and Gynecology	Normal Delivery	Normal Delivery
403	Obstetrics and Gynecology	Normal Delivery	Normal Delivery
404	Obstetrics and Gynecology	Normal Delivery	Normal Vaginal Delivery with Epidural Anesthesia
405	Obstetrics and Gynecology	Normal Delivery	Normal Vaginal Delivery in Twins(Multiple pregnency)
418	Obstetrics and Gynecology	Caesarean section	Caesarean section
419	Obstetrics and Gynecology	Caesarean section	Caesarean Delivery with well baby care
420	Obstetrics and Gynecology	Caesarean section	Caesarean Delivery twins with well baby care
421	Obstetrics and Gynecology	Caesarean section	Caesarean Hysterectomy with bladder repair
422	Obstetrics and Gynecology	Caesarean section	Complicated LSCS
1331	Obstetrics and Gynecology	Normal Delivery	Normal delivery with well baby care(single) twins Rs.10000/- extra
1332	Obstetrics and Gynecology	Caesarean Section	LSCS with well baby care(single),Rs.10000/- extra for twins
1340	Obstetrics and Gynecology	Normal Delivery	Epidural delivery with well baby care(single/twins Rs.10000/- extra)




<img width="951" height="291" alt="image" src="https://github.com/user-attachments/assets/8dd931a4-0b3b-4cd1-a7ae-0efe20273076" />


Maternity Checks
 
Member- Patient check
Details from Hospital check
Supporting Report- Ultrasound or GPLA status (Gravida, Para,Living,Abortion)

Identify the numeric value against each of the abbreviations given above and compare that with benefit plan under 'Maternity' for coverage details- extract remarks to identify no. of child births covered.
Policy check- Benefit Plan-BP Condition IDs= 19,20,21,22,23,24,25
Exclusions
Exclusions-Waiting Periods (Identify and compare waiting periods based on the configuration. Maternity waiting Periods are configured by comparing DOA with Member's joining date.-- Remind me on samples..
Maternity - Identify the mode of delivery- C Section/Normal Delivery etc., check for limit against them and compare them with the initial documents. 

Extract remarks too to check info on no. of child births covered.
Room eligibility- No default value for approved accommodation- Need to get this from Benefit Plan (BPConditionIDs= 41,42,43) 
General Conditions- Copayment (look for copay conditions across other rules too)
Intimation- Check for any intimation clause
Medical Coding

ICD-O series- Will share TPA procedures
Identify Tariffs- same as Cataract
Flag PackageType in coding section

Sample benefit plan - Remarks
Maternity covered from Day one upto the limit of Rs.50,000/- for Normal for first 2 Children. ---W.E.F INCEPTION OF THE POLICY, Co-pay: not to apply co-pay for maternity claims where the admissible amount is above Rs.50,000/- after deducting the non-medicals and the co-pay from the final bill VIDE INSURER MAIL RECIEVED & UPDATED ON 05-02-2026.
Maternity covered from Day one upto the limit of Rs.50,000/- for C-Section for first 2 Children. ---W.E.F INCEPTION OF THE POLICY, Co-pay: not to apply co-pay for maternity claims where the admissible amount is above Rs.50,000/- after deducting the non-medicals and the co-pay from the final bill VIDE INSURER MAIL RECIEVED & UPDATED ON 05-02-2026.
A rejection reason sample from a claim with the same Benefit plan remarks stated above
As per policy maternity is covered for first two living children only . As per submitted documents patient is already having two living children hence maternity sublimit exhausted , claim stands rejected .
FYI- Document reference-She has L2- meaning 2 living children already. It may not be available in the Preauth form. This was found in Inpatient Initial Assessment form and not in Preauth Form.
 
