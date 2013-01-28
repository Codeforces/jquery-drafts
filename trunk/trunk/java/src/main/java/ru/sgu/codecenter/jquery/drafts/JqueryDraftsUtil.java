package ru.sgu.codecenter.jquery.drafts;

import java.util.ArrayList;
import java.util.List;

public class JqueryDraftsUtil {
    public static List<String> update(List<String> items, int maxSize, String text) {
        if (items == null) {
            items = new ArrayList<String>(1);
        }

        if (text == null || text.length() <= 1) {
            return items;
        }

        if (items.isEmpty()) {
            items.add(text);
        } else {
            int bestIndex = -1;
            int bestDifference = Integer.MAX_VALUE;

            for (int i = 0; i < items.size(); i++) {
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
        int l = 0;
        while (l < s.length() && l < t.length() && s.charAt(l) == t.charAt(l)) {
            l++;
        }

        int r = 0;
        while (r < s.length() && r < t.length() && s.charAt(s.length() - 1 - r) == t.charAt(t.length() - 1 - r)) {
            r++;
        }

        return Math.max(0, s.length() - l - r) + Math.max(0, t.length() - l - r);
    }
}
