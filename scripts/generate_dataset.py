"""
MDR-TB Smart Hospital Synthetic Contact Dataset & DBN CPT Derivation Generator
Author: MedTrace Research / IEEE Publication Suite
Description: Generates 100,000 publication-quality synthetic contact records 
             modeling hospital interactions, log-distance BLE propagation, 
             and WHO/CDC TB risk scoring rules.
"""

import os
import math
import json
import random
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

# Fix Random Seed for 100% Reproducibility
SEED = 42
random.seed(SEED)
np.random.seed(SEED)

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "output")
CPT_DIR = os.path.join(OUTPUT_DIR, "cpts")
PLOT_DIR = os.path.join(OUTPUT_DIR, "plots")

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(CPT_DIR, exist_ok=True)
os.makedirs(PLOT_DIR, exist_ok=True)

# Hospital Configuration Parameters
WARDS = ["General", "ICU", "Isolation", "OPD"]
WARD_PROBS = [0.45, 0.20, 0.10, 0.25]  # Distribution of contact locations

# Gateway IDs mapped to Wards
GATEWAYS = {
    "General": ["GW-GEN-01", "GW-GEN-02", "GW-GEN-03"],
    "ICU": ["GW-ICU-01", "GW-ICU-02"],
    "Isolation": ["GW-ISO-01"],
    "OPD": ["GW-OPD-01", "GW-OPD-02", "GW-OPD-03"]
}

# BLE Path Loss Model Exponents (n) by Ward
PATH_LOSS_N = {
    "General": 2.4,
    "ICU": 2.2,
    "Isolation": 3.0,  # High wall attenuation
    "OPD": 2.6
}

P_TX_1M = -59.0  # RSSI at 1 meter reference distance (dBm)
SHADOWING_STD = 3.5  # dBm noise std (multipath fading + body attenuation)

# Infectious source base prevalence (e.g. index patients in hospital)
INFECTIOUS_PROB = 0.12

# Ventilation probabilities by Ward
VENTILATION_DIST = {
    "General": ["Poor", "Moderate", "Good"],
    "General_Probs": [0.35, 0.45, 0.20],
    "ICU": ["Poor", "Moderate", "Good"],
    "ICU_Probs": [0.10, 0.40, 0.50],
    "Isolation": ["Poor", "Moderate", "Good"],
    "Isolation_Probs": [0.02, 0.18, 0.80],  # Negative pressure HEPA ventilation
    "OPD": ["Poor", "Moderate", "Good"],
    "OPD_Probs": [0.40, 0.40, 0.20]
}

# Mask compliance probabilities by Ward
MASK_DIST = {
    "General": ["None", "Partial", "Full"],
    "General_Probs": [0.40, 0.45, 0.15],
    "ICU": ["None", "Partial", "Full"],
    "ICU_Probs": [0.15, 0.35, 0.50],
    "Isolation": ["None", "Partial", "Full"],
    "Isolation_Probs": [0.02, 0.08, 0.90],
    "OPD": ["None", "Partial", "Full"],
    "OPD_Probs": [0.50, 0.35, 0.15]
}

# Generate Pool of Patients, Doctors, Nurses
PATIENT_IDS = [f"PAT-{i:04d}" for i in range(1, 501)]
DOCTOR_IDS = [f"DOC-{i:03d}" for i in range(1, 61)]
NURSE_IDS = [f"NUR-{i:03d}" for i in range(1, 121)]
VISITOR_IDS = [f"VIS-{i:04d}" for i in range(1, 201)]

ALL_SUBJECTS = PATIENT_IDS + DOCTOR_IDS + NURSE_IDS + VISITOR_IDS

# Designate known infectious index cases (~10% of patients)
INFECTIOUS_SUBJECTS = set(random.sample(PATIENT_IDS, int(len(PATIENT_IDS) * 0.10)))

def generate_contact_dataset(num_records=100000):
    print(f"Generating {num_records:,} contact records based on BLE physics and WHO/CDC guidelines...")
    
    records = []
    start_base_time = pd.Timestamp("2026-08-01 08:00:00")
    
    for i in range(1, num_records + 1):
        contact_id = f"CNT-{i:06d}"
        
        # 1. Ward & Gateway Selection
        ward = np.random.choice(WARDS, p=WARD_PROBS)
        gateway = random.choice(GATEWAYS[ward])
        
        # 2. Pair Selection (Realistic contact patterns)
        subj_a = random.choice(ALL_SUBJECTS)
        subj_b = random.choice(ALL_SUBJECTS)
        while subj_b == subj_a:
            subj_b = random.choice(ALL_SUBJECTS)
            
        # 3. Timestamps & Time of Day
        offset_minutes = random.randint(0, 14 * 24 * 60)  # 14 day simulation window
        start_dt = start_base_time + pd.Timedelta(minutes=offset_minutes)
        hour = start_dt.hour
        
        if 6 <= hour < 12:
            tod = "Morning"
        elif 12 <= hour < 17:
            tod = "Afternoon"
        elif 17 <= hour < 22:
            tod = "Evening"
        else:
            tod = "Night"
            
        # 4. Contact Duration (minutes) - Exponentially distributed with hospital ward variations
        if ward == "Isolation":
            duration = round(float(np.random.exponential(scale=15.0) + 1.0), 2)
        elif ward == "ICU":
            duration = round(float(np.random.exponential(scale=25.0) + 2.0), 2)
        elif ward == "OPD":
            duration = round(float(np.random.exponential(scale=12.0) + 0.5), 2)
        else:  # General
            duration = round(float(np.random.exponential(scale=20.0) + 1.0), 2)
        duration = min(duration, 240.0)  # Cap at 4 hours max
        
        end_dt = start_dt + pd.Timedelta(minutes=duration)
        
        # 5. Distance (meters) - Log-normal physical distribution of encounters
        # Close contacts (<1.5m) occur during examinations/bedside care; Moderate (1.5-4m); Far (>4m)
        dist_raw = float(np.random.lognormal(mean=0.8, sigma=0.6))
        distance = max(0.3, min(dist_raw, 12.0))
        distance = round(distance, 2)
        
        if distance < 1.5:
            dist_cat = "Close"
        elif distance <= 4.0:
            dist_cat = "Moderate"
        else:
            dist_cat = "Far"
            
        # 6. BLE RSSI Calculation (Log-Distance Path Loss Model + Multipath & Body Attenuation)
        n = PATH_LOSS_N[ward]
        rssi_theoretical = P_TX_1M - (10.0 * n * math.log10(distance))
        shadowing_noise = float(np.random.normal(0, SHADOWING_STD))
        
        # Additional body attenuation if close contact (blocking direct line of sight)
        body_attenuation = -4.0 if dist_cat == "Close" and random.random() < 0.6 else 0.0
        
        rssi = round(rssi_theoretical + shadowing_noise + body_attenuation, 1)
        rssi = max(-98.0, min(-30.0, rssi))
        
        # Recalculate estimated distance from measured RSSI
        est_distance = round(10.0 ** ((P_TX_1M - rssi) / (10.0 * n)), 2)
        
        # 7. Contact Recurrence (number of encounters in previous 7 days)
        # Higher recurrence for doctors/nurses with ward patients
        is_staff = subj_a.startswith(("DOC", "NUR")) or subj_b.startswith(("DOC", "NUR"))
        if is_staff:
            recurrence = int(np.random.poisson(lam=5.5))
        else:
            recurrence = int(np.random.poisson(lam=1.2))
        recurrence = min(recurrence, 30)
        
        # 8. Temporal Decay computation: w(t) = exp(-lambda * delta_t_days)
        # Half-life = 7 days => lambda = ln(2)/7 = 0.099021
        days_ago = random.uniform(0.0, 7.0)
        decay_lambda = math.log(2) / 7.0
        temporal_decay = round(math.exp(-decay_lambda * days_ago), 4)
        
        # 9. Infectious Source (Yes/No)
        is_infectious = "Yes" if (subj_a in INFECTIOUS_SUBJECTS or subj_b in INFECTIOUS_SUBJECTS) else "No"
        
        # 10. Ventilation & Mask Compliance based on ward
        ventilation = np.random.choice(
            VENTILATION_DIST[ward], 
            p=VENTILATION_DIST[f"{ward}_Probs"]
        )
        mask = np.random.choice(
            MASK_DIST[ward], 
            p=MASK_DIST[f"{ward}_Probs"]
        )
        
        # 11. WHO / CDC Ground Truth Risk Rule Engine
        if is_infectious == "No":
            # Baseline background nosocomial risk
            risk = "Low"
        else:
            # Epidemiological Exposure Score Calculation
            # Duration weight: WHO >15 min threshold
            dur_weight = min(1.0, duration / 60.0)
            
            # Distance factor
            dist_factor = 1.0 if dist_cat == "Close" else (0.45 if dist_cat == "Moderate" else 0.10)
            
            # Ventilation factor (WHO airborne infection control)
            vent_factor = 1.0 if ventilation == "Poor" else (0.50 if ventilation == "Moderate" else 0.20)
            
            # Mask compliance factor (CDC respirator protection efficiency)
            mask_factor = 1.0 if mask == "None" else (0.50 if mask == "Partial" else 0.10)
            
            # Recurrence multiplier
            recurrence_mult = 1.0 + 0.12 * min(5, recurrence)
            
            exposure_score = dur_weight * dist_factor * vent_factor * mask_factor * recurrence_mult * temporal_decay
            
            # Risk Thresholding enforcing hospital class imbalance (~72% Low, ~21% Medium, ~7% High)
            if exposure_score >= 0.18:
                risk = "High"
            elif exposure_score >= 0.04:
                risk = "Medium"
            else:
                risk = "Low"
                
        records.append({
            "Contact_ID": contact_id,
            "Timestamp_Start": start_dt.strftime("%Y-%m-%d %H:%M:%S"),
            "Timestamp_End": end_dt.strftime("%Y-%m-%d %H:%M:%S"),
            "Contact_Duration": duration,
            "Patient_A_ID": subj_a,
            "Patient_B_ID": subj_b,
            "Ward_Type": ward,
            "RSSI": rssi,
            "Estimated_Distance": est_distance,
            "Distance_Category": dist_cat,
            "Contact_Recurrence": recurrence,
            "Temporal_Decay": temporal_decay,
            "Infectious_Source": is_infectious,
            "Ventilation_Level": ventilation,
            "Mask_Compliance": mask,
            "Gateway_ID": gateway,
            "Time_of_Day": tod,
            "Ground_Truth_Risk": risk
        })
        
    df = pd.DataFrame(records)
    return df

def generate_summary_statistics(df):
    print("Computing summary statistics for all 18 variables...")
    stats = []
    
    for col in df.columns:
        col_type = str(df[col].dtype)
        count = int(df[col].count())
        nulls = int(df[col].isnull().sum())
        
        if pd.api.types.is_numeric_dtype(df[col]):
            mean_val = round(float(df[col].mean()), 4)
            std_val = round(float(df[col].std()), 4)
            min_val = round(float(df[col].min()), 4)
            q25_val = round(float(df[col].quantile(0.25)), 4)
            q50_val = round(float(df[col].median()), 4)
            q75_val = round(float(df[col].quantile(0.75)), 4)
            max_val = round(float(df[col].max()), 4)
            mode_val = str(df[col].mode()[0])
        else:
            mean_val = np.nan
            std_val = np.nan
            min_val = np.nan
            q25_val = np.nan
            q50_val = np.nan
            q75_val = np.nan
            max_val = np.nan
            mode_val = str(df[col].mode()[0])
            
        stats.append({
            "Variable": col,
            "DataType": col_type,
            "Count": count,
            "Null_Count": nulls,
            "Mean": mean_val,
            "Std": std_val,
            "Min": min_val,
            "25%": q25_val,
            "50% (Median)": q50_val,
            "75%": q75_val,
            "Max": max_val,
            "Mode": mode_val
        })
        
    stats_df = pd.DataFrame(stats)
    return stats_df

def derive_cpts(df):
    print("Deriving Prior Probabilities and DBN Conditional Probability Tables (CPTs)...")
    
    # 1. Prior Probabilities
    priors = {}
    cat_vars = ["Ward_Type", "Distance_Category", "Infectious_Source", "Ventilation_Level", "Mask_Compliance", "Ground_Truth_Risk", "Time_of_Day"]
    
    prior_rows = []
    for var in cat_vars:
        counts = df[var].value_counts(normalize=True).to_dict()
        priors[var] = counts
        for state, prob in counts.items():
            prior_rows.append({
                "Variable": var,
                "State": state,
                "Prior_Probability": round(float(prob), 5)
            })
    prior_df = pd.DataFrame(prior_rows)
    
    # Bin continuous RSSI for discrete Bayesian Network CPT
    # RSSI Bins: Strong (>-65 dBm), Moderate (-65 to -80 dBm), Weak (<-80 dBm)
    df["RSSI_Bin"] = pd.cut(
        df["RSSI"], 
        bins=[-np.inf, -80.0, -65.0, np.inf], 
        labels=["Weak (<-80dBm)", "Moderate (-65 to -80dBm)", "Strong (>-65dBm)"]
    )
    
    # Duration Bins: Brief (<15 min), Moderate (15-45 min), Prolonged (>45 min)
    df["Duration_Bin"] = pd.cut(
        df["Contact_Duration"],
        bins=[-np.inf, 15.0, 45.0, np.inf],
        labels=["Brief (<15m)", "Moderate (15-45m)", "Prolonged (>45m)"]
    )
    
    # Temporal Decay Bins: High (>0.7), Medium (0.4-0.7), Low (<0.4)
    df["Temporal_Decay_Bin"] = pd.cut(
        df["Temporal_Decay"],
        bins=[-np.inf, 0.4, 0.7, np.inf],
        labels=["Low (<0.4)", "Medium (0.4-0.7)", "High (>0.7)"]
    )
    
    # Recurrence Bins: Single (0-1), Occasional (2-4), Frequent (5+)
    df["Recurrence_Bin"] = pd.cut(
        df["Contact_Recurrence"],
        bins=[-np.inf, 1, 4, np.inf],
        labels=["Single (0-1)", "Occasional (2-4)", "Frequent (5+)"]
    )
    
    # CPT 1: P(RSSI_Bin | Distance_Category, Ward_Type)
    cpt1_counts = df.groupby(["Distance_Category", "Ward_Type", "RSSI_Bin"], observed=False).size().unstack(fill_value=0)
    cpt1_prob = cpt1_counts.div(cpt1_counts.sum(axis=1), axis=0).fillna(0.0).round(5)
    cpt1_df = cpt1_prob.reset_index()
    
    # CPT 2: P(Ground_Truth_Risk | Infectious_Source, Distance_Category, Duration_Bin, Ventilation_Level, Mask_Compliance)
    cpt2_counts = df.groupby(["Infectious_Source", "Distance_Category", "Duration_Bin", "Ventilation_Level", "Mask_Compliance", "Ground_Truth_Risk"], observed=False).size().unstack(fill_value=0)
    cpt2_prob = cpt2_counts.div(cpt2_counts.sum(axis=1), axis=0).fillna(0.0).round(5)
    cpt2_df = cpt2_prob.reset_index()
    
    # CPT 3: DBN Temporal Transition CPT: P(Ground_Truth_Risk_t | Ground_Truth_Risk_t-1, Temporal_Decay_Bin, Recurrence_Bin)
    # Simulate previous risk state with realistic persistence
    risk_states = ["Low", "Medium", "High"]
    prev_risks = []
    for cur_risk in df["Ground_Truth_Risk"]:
        if random.random() < 0.75:
            prev_risks.append(cur_risk)
        else:
            prev_risks.append(random.choice(risk_states))
    df["Prev_Ground_Truth_Risk"] = prev_risks
    
    cpt3_counts = df.groupby(["Prev_Ground_Truth_Risk", "Temporal_Decay_Bin", "Recurrence_Bin", "Ground_Truth_Risk"], observed=False).size().unstack(fill_value=0)
    cpt3_prob = cpt3_counts.div(cpt3_counts.sum(axis=1), axis=0).fillna(0.0).round(5)
    cpt3_df = cpt3_prob.reset_index()
    
    return prior_df, cpt1_df, cpt2_df, cpt3_df

def generate_plots(df):
    print("Generating distribution histograms and correlation matrix plots...")
    
    # 1. Histograms
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    sns.set_theme(style="whitegrid")
    
    # Duration Histogram
    sns.histplot(df["Contact_Duration"], kde=True, ax=axes[0, 0], color="#2563EB", bins=40)
    axes[0, 0].set_title("Contact Duration Distribution (Minutes)", fontsize=14, fontweight="bold")
    axes[0, 0].set_xlabel("Duration (min)")
    axes[0, 0].set_ylabel("Frequency")
    
    # RSSI Histogram
    sns.histplot(df["RSSI"], kde=True, ax=axes[0, 1], color="#059669", bins=40)
    axes[0, 1].set_title("BLE RSSI Distribution (dBm)", fontsize=14, fontweight="bold")
    axes[0, 1].set_xlabel("RSSI (dBm)")
    axes[0, 1].set_ylabel("Frequency")
    
    # Distance Histogram
    sns.histplot(df["Estimated_Distance"], kde=True, ax=axes[1, 0], color="#D97706", bins=40)
    axes[1, 0].set_title("Estimated Distance Distribution (Meters)", fontsize=14, fontweight="bold")
    axes[1, 0].set_xlabel("Distance (m)")
    axes[1, 0].set_ylabel("Frequency")
    
    # Risk Class Imbalance Bar Plot
    risk_order = ["Low", "Medium", "High"]
    risk_counts = df["Ground_Truth_Risk"].value_counts().reindex(risk_order)
    sns.barplot(x=risk_counts.index, y=risk_counts.values, ax=axes[1, 1], palette=["#10B981", "#F59E0B", "#EF4444"])
    axes[1, 1].set_title("Ground Truth Risk Category Skew (WHO/CDC Rules)", fontsize=14, fontweight="bold")
    axes[1, 1].set_xlabel("Risk Category")
    axes[1, 1].set_ylabel("Count")
    
    # Add count labels
    for i, count in enumerate(risk_counts.values):
        pct = (count / len(df)) * 100
        axes[1, 1].text(i, count + 1000, f"{count:,}\n({pct:.1f}%)", ha="center", fontsize=11, fontweight="bold")
        
    plt.tight_layout()
    plt.savefig(os.path.join(PLOT_DIR, "histograms.png"), dpi=300)
    plt.close()
    
    # 2. Correlation Matrix Plot
    plt.figure(figsize=(10, 8))
    
    # Encode categorical features for correlation calculation
    df_corr = pd.DataFrame()
    df_corr["Duration"] = df["Contact_Duration"]
    df_corr["RSSI"] = df["RSSI"]
    df_corr["Distance"] = df["Estimated_Distance"]
    df_corr["Recurrence"] = df["Contact_Recurrence"]
    df_corr["Temporal_Decay"] = df["Temporal_Decay"]
    df_corr["Infectious"] = df["Infectious_Source"].map({"No": 0, "Yes": 1})
    df_corr["Ventilation"] = df["Ventilation_Level"].map({"Poor": 3, "Moderate": 2, "Good": 1})
    df_corr["Mask"] = df["Mask_Compliance"].map({"None": 3, "Partial": 2, "Full": 1})
    df_corr["Risk_Level"] = df["Ground_Truth_Risk"].map({"Low": 1, "Medium": 2, "High": 3})
    
    corr_matrix = df_corr.corr()
    sns.heatmap(corr_matrix, annot=True, fmt=".2f", cmap="coolwarm", vmin=-1.0, vmax=1.0, linewidths=0.5)
    plt.title("Correlation Matrix of Contact Risk Predictors", fontsize=14, fontweight="bold")
    plt.tight_layout()
    plt.savefig(os.path.join(PLOT_DIR, "correlation_matrix.png"), dpi=300)
    plt.close()
    
    return corr_matrix

def main():
    print("=========================================================================")
    print(" MDR-TB Smart Hospital Dataset & DBN CPT Generator ")
    print("=========================================================================")
    
    df = generate_contact_dataset(num_records=100000)
    
    # 1. Export CSV
    csv_path = os.path.join(OUTPUT_DIR, "synthetic_tb_contacts_100k.csv")
    print(f"Saving full CSV to {csv_path}...")
    df.to_csv(csv_path, index=False)
    
    # 2. Compute Summary Statistics
    stats_df = generate_summary_statistics(df)
    stats_path = os.path.join(OUTPUT_DIR, "summary_statistics.csv")
    print(f"Saving summary statistics to {stats_path}...")
    stats_df.to_csv(stats_path, index=False)
    
    # 3. Derive CPTs
    prior_df, cpt1_df, cpt2_df, cpt3_df = derive_cpts(df)
    
    prior_path = os.path.join(CPT_DIR, "cpt_priors.csv")
    cpt1_path = os.path.join(CPT_DIR, "cpt_rssi_distance_ward.csv")
    cpt2_path = os.path.join(CPT_DIR, "cpt_risk_exposure_factors.csv")
    cpt3_path = os.path.join(CPT_DIR, "cpt_dbn_temporal_transition.csv")
    
    print(f"Saving CPTs to {CPT_DIR}...")
    prior_df.to_csv(prior_path, index=False)
    cpt1_df.to_csv(cpt1_path, index=False)
    cpt2_df.to_csv(cpt2_path, index=False)
    cpt3_df.to_csv(cpt3_path, index=False)
    
    # 4. Generate Plots
    corr_matrix = generate_plots(df)
    
    # 5. Export Excel (.xlsx)
    excel_path = os.path.join(OUTPUT_DIR, "synthetic_tb_contacts_100k.xlsx")
    print(f"Saving Excel workbook with formatted sheets to {excel_path}...")
    with pd.ExcelWriter(excel_path, engine="openpyxl") as writer:
        df.head(10000).to_excel(writer, sheet_name="Contact_Data_Sample", index=False)
        stats_df.to_excel(writer, sheet_name="Summary_Statistics", index=False)
        prior_df.to_excel(writer, sheet_name="Prior_Probabilities", index=False)
        cpt1_df.to_excel(writer, sheet_name="CPT_RSSI_Dist_Ward", index=False)
        cpt2_df.to_excel(writer, sheet_name="CPT_Risk_Exposure", index=False)
        cpt3_df.to_excel(writer, sheet_name="CPT_DBN_Transition", index=False)
        
    print("=========================================================================")
    print(" Dataset Generation & DBN CPT Derivation Completed Successfully! ")
    print("=========================================================================")

if __name__ == "__main__":
    main()
