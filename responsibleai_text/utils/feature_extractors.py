# Copyright (c) Microsoft Corporation
# Licensed under the MIT License.

"""Defines the text feature extraction utilities."""

import re
from typing import List, Union

import pandas as pd
import spacy
from negspacy.termsets import termset
from nlp_feature_extractors import attribute_extractors as exts
from tqdm import tqdm

from responsibleai_text.common.constants import (ModelTask,
                                                 QuestionAnsweringFields)

nlp = None


def extract_features(text_dataset: pd.DataFrame,
                     target_column: Union[str, List], task_type: str):
    '''Extract tabular data features from the text dataset.

    :param text_dataset: A pandas dataframe containing the text data.
    :type text_dataset: pandas.DataFrame
    :param target_column: The name of the label column or list of columns.
            This is a list of columns for multilabel models.
    :type target_column: str or list[str]
    :param task_type: The type of task to be performed.
    :type task_type: str
    :return: The list of extracted features and the feature names.
    :rtype: list, list
    '''
    results = []
    base_feature_names = ["positive_words", "negative_words",
                          "negation_words", "negated_entities",
                          "named_persons", "sentence_length"]
    single_text_col_tasks = [ModelTask.TEXT_CLASSIFICATION,
                             ModelTask.MULTILABEL_TEXT_CLASSIFICATION]
    if task_type in single_text_col_tasks:
        feature_names = base_feature_names
    elif task_type == ModelTask.QUESTION_ANSWERING:
        feature_names = []
        prefixes = [QuestionAnsweringFields.CONTEXT + "_",
                    QuestionAnsweringFields.QUESTION + "_"]
        for prefix in prefixes:
            for feature_name in base_feature_names:
                feature_names.append(prefix + feature_name)

        feature_names.append("question_type")
    else:
        raise ValueError("Unknown task type: {}".format(task_type))
    if not isinstance(target_column, list):
        target_column = [target_column]
    text_features = text_dataset.drop(target_column, axis=1)

    if task_type in single_text_col_tasks:
        sentences = text_features.iloc[:, 0].tolist()
        for sentence in tqdm(sentences):
            extracted_features = []
            add_extracted_features_for_sentence(sentence, extracted_features)
            results.append(extracted_features)
    elif task_type == ModelTask.QUESTION_ANSWERING:
        for _, row in tqdm(text_features.iterrows()):
            extracted_features = []
            add_extracted_features_for_sentence(
                row[QuestionAnsweringFields.CONTEXT], extracted_features)
            add_extracted_features_for_sentence(
                row[QuestionAnsweringFields.QUESTIONS], extracted_features, sentence_type="QUESTION")
            results.append(extracted_features)
    else:
        raise ValueError("Unknown task type: {}".format(task_type))
    return results, feature_names


def add_extracted_features_for_sentence(sentence, extracted_features, sentence_type=None):
    global nlp
    if nlp is None:
        nlp = spacy.load("en_core_web_sm")
        ts = termset("en")
        nlp.add_pipe("negex", config={"neg_termset": ts.get_patterns()})
    doc = nlp(sentence)
    positive_negative_count = exts.positive_negative_word_count(doc)
    named_persons = exts.get_named_persons(doc)
    neg_words_and_entities = exts.detect_negation_words_and_entities(doc)
    sentence_length = len(sentence)
    features = [positive_negative_count["positive_word_count"],
                positive_negative_count["negative_word_count"],
                neg_words_and_entities["negation_words"],
                neg_words_and_entities["negated_entities"],
                len(named_persons),
                sentence_length]

    if sentence_type == 'QUESTION':
        question_type = get_question_type(sentence)
        features.append(question_type)

    # TODO: This extractor seems to be very slow:
    # mf_count = exts.get_male_female_words_count(doc)

    extracted_features.extend(features)


def get_question_type(qtext):

    if re.search(r'\b\A(can|could|will|would|have|has|do|does|' +
                 'did|is|are|was|may|might)', qtext, re.I):
        return "YES/NO"
    elif re.search(r'\b\A(what|which)\s+(\w+)', qtext, re.I):
        nextword = re.search(r'\b\A(what|which)\s+(\w+)', qtext, re.I).group(2)
        if nextword == "year" or nextword == "month" or nextword == "date" or nextword == "day":
            return "WHEN"
        else:
            return "WHAT"
    elif re.search(r'\bwho\s', qtext, re.I):
        return "WHO"
    elif re.search(r'\bwhy\s', qtext, re.I):
        return "WHY"
    elif re.search(r'\bwhere\s', qtext, re.I):
        return "WHERE"
    elif re.search(r'\bhow\s', qtext, re.I):
        nextword = re.search(r'\b(how)\s(\w+)', qtext, re.I).group(2)
        if nextword == "many" or nextword == "much" or nextword == "long":
            return "NUMBER"
        else:
            return "HOW"
    elif re.search(r'\bwhen\s', qtext, re.I):
        return "WHEN"
    elif "in what year" in qtext or "in which year" in qtext:
        return "WHEN"
    elif re.search(r'\bto\swhom\s', qtext, re.I):
        return "WHO"
    else:
        return "OTHER"