// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { localization } from "@responsible-ai/localization";
import { AccessibleChart, chartColors } from "@responsible-ai/mlchartlib";
import { getTheme, ITheme, Label, Stack } from "office-ui-fabric-react";
import React from "react";

import { PredictionTypes } from "../../IFairnessProps";
import { FormatMetrics } from "../../util/FormatMetrics";
import { IFairnessContext } from "../../util/IFairnessContext";
import { performanceOptions } from "../../util/PerformanceMetrics";
import { SummaryTable } from "../../v2/Controls/SummaryTable";
import { BarPlotlyProps } from "../BarPlotlyProps";
import { IFeatureBinPickerPropsV2 } from "../FairnessWizard";
import { IMetrics } from "../IMetrics";
import { SharedStyles } from "../Shared.styles";

import { ModalHelp } from "./ModalHelp";

interface IOutcomePlotProps {
  dashboardContext: IFairnessContext;
  metrics: IMetrics;
  nameIndex: number[];
  theme: ITheme | undefined;
  areaHeights: number;
  featureBinPickerProps: IFeatureBinPickerPropsV2;
}

export class OutcomePlot extends React.PureComponent<IOutcomePlotProps> {
  public render(): React.ReactNode {
    const barPlotlyProps = new BarPlotlyProps();
    const theme = getTheme();
    const sharedStyles = SharedStyles();
    const outcomeKey =
      this.props.dashboardContext.modelMetadata.PredictionType ===
      PredictionTypes.BinaryClassification
        ? "selection_rate"
        : "average";
    const outcomeMetric = performanceOptions[outcomeKey];
    const nameIndex = this.props.dashboardContext.groupNames.map((_, i) => i);
    let outcomeChartHeaderString = "";
    let outcomeChartModalHelpStrings: string[] = [];

    if (
      this.props.dashboardContext.modelMetadata.PredictionType ===
      PredictionTypes.BinaryClassification
    ) {
      barPlotlyProps.data = [
        {
          fillcolor: chartColors[0],
          hoverinfo: "skip",
          name: outcomeMetric.title,
          orientation: "h",
          text: this.props.metrics.outcomes.bins.map((num) =>
            FormatMetrics.formatNumbers(num, "selection_rate", false, 2)
          ),
          textposition: "inside",
          type: "bar",
          x: this.props.metrics.outcomes.bins,
          y: nameIndex
        }
      ];
      if (barPlotlyProps.layout?.xaxis) {
        barPlotlyProps.layout.xaxis.tickformat = ",.0%";
      }
      outcomeChartModalHelpStrings = [
        localization.Fairness.Report.classificationOutcomesHowToRead
      ];
      outcomeChartHeaderString = localization.Fairness.Metrics.selectionRate;
    }
    if (
      this.props.dashboardContext.modelMetadata.PredictionType ===
      PredictionTypes.Probability
    ) {
      const outcomeText = this.props.metrics.predictions?.map((val) => {
        return localization.formatString(
          localization.Fairness.Report.tooltipPrediction,
          FormatMetrics.formatNumbers(val, "average", false, 3)
        );
      });
      barPlotlyProps.data = [
        {
          boxmean: true,
          boxpoints: "all",
          color: chartColors[0],
          hoverinfo: "text",
          hoveron: "points",
          jitter: 0.4,
          orientation: "h",
          pointpos: 0,
          text: outcomeText,
          type: "box",
          x: this.props.metrics.predictions,
          y: this.props.dashboardContext.binVector
        } as any
      ];
      outcomeChartModalHelpStrings = [
        localization.Fairness.Report.regressionOutcomesHowToRead
      ];
      outcomeChartHeaderString =
        localization.Fairness.Report.distributionOfPredictions;
    }
    if (
      this.props.dashboardContext.modelMetadata.PredictionType ===
      PredictionTypes.Regression
    ) {
      const outcomeText = this.props.metrics.predictions?.map((val) => {
        return localization.formatString(
          localization.Fairness.Report.tooltipPrediction,
          val
        );
      });
      barPlotlyProps.data = [
        {
          boxmean: true,
          boxpoints: "all",
          color: chartColors[0],
          hoverinfo: "text",
          hoveron: "points",
          jitter: 0.4,
          orientation: "h",
          pointpos: 0,
          text: outcomeText,
          type: "box",
          x: this.props.metrics.predictions,
          y: this.props.dashboardContext.binVector
        } as any
      ];
      outcomeChartModalHelpStrings = [
        localization.Fairness.Report.regressionOutcomesHowToRead
      ];
      outcomeChartHeaderString =
        localization.Fairness.Report.distributionOfPredictions;
    }

    const formattedBinOutcomeValues = this.props.metrics.outcomes.bins.map(
      (value) => FormatMetrics.formatNumbers(value, outcomeKey)
    );

    return (
      <Stack tokens={{ padding: "0 0 0 100px" }}>
        <Label>{outcomeChartHeaderString}</Label>
        <div
          className={sharedStyles.presentationArea}
          style={{ height: `${this.props.areaHeights}px` }}
        >
          <SummaryTable
            binGroup={
              this.props.dashboardContext.modelMetadata.featureNames[
                this.props.featureBinPickerProps.selectedBinIndex
              ]
            }
            binLabels={this.props.dashboardContext.groupNames}
            formattedBinValues={formattedBinOutcomeValues}
            metricLabel={outcomeMetric.title}
            binValues={this.props.metrics.outcomes.bins}
          />
          <div className={sharedStyles.chartWrapper}>
            <Stack horizontal={true} horizontalAlign={"space-between"}>
              <div className={sharedStyles.chartSubHeader}></div>
              <ModalHelp theme={theme} strings={outcomeChartModalHelpStrings} />
            </Stack>
            <div className={sharedStyles.chartBody}>
              <AccessibleChart plotlyProps={barPlotlyProps} theme={undefined} />
            </div>
          </div>
        </div>
      </Stack>
    );
  }
}