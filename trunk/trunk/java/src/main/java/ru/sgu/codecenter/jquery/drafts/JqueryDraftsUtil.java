package ru.sgu.codecenter.jquery.drafts;

import java.util.ArrayList;
import java.util.List;

public class JqueryDraftsUtil {
    public static List<String> update(List<String> items, int maxSize, String text) {
        if (items == null) {
            items = new ArrayList<>(1);
        }

        if (text == null || text.length() <= 1) {
            return items;
        }

        if (items.isEmpty()) {
            items.add(text);
        } else {
            int bestIndex = -1;
            int bestDifference = Integer.MAX_VALUE;

            for (int i = 0; i < items.size(); ++i) {
                int currentDifference = difference(items.get(i), text);
                if (currentDifference < bestDifference) {
                    bestDifference = currentDifference;
                    bestIndex = i;
                }
            }

            if (bestDifference < 40) {
                items.set(bestIndex, text);
            } else {
                if (items.size() < maxSize) {
                    items.add(text);
                } else {
                    items.set(bestIndex, text);
                }
            }
        }

        return items;
    }

    private static int difference(String s, String t) {
        int left = 0;
        while (left < s.length() && left < t.length() && s.charAt(left) == t.charAt(left)) {
            ++left;
        }

        int right = 0;
        while (right < s.length() && right < t.length() && s.charAt(s.length() - 1 - right) == t.charAt(t.length() - 1 - right)) {
            ++right;
        }

        return StrictMath.max(0, s.length() - left - right) + StrictMath.max(0, t.length() - left - right);
    }
}
