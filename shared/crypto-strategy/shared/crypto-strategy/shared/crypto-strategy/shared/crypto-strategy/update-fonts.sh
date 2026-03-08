#!/bin/bash

# Update all masterplan cards with standardized Inter font and text sizes

for i in {3..6}; do
    file="masterplan-card${i}.html"
    echo "Updating $file..."
    
    # Replace font family and sizes
    sed -i '' \
        -e "s/font-family:'Segoe UI',system-ui,sans-serif/font-family:'Inter',system-ui,sans-serif/g" \
        -e "1i\\
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');" \
        -e "s/font-size:48px/font-size:32px;font-weight:700/g" \
        -e "s/font-size:42px/font-size:32px;font-weight:700/g" \
        -e "s/font-size:36px/font-size:32px;font-weight:700/g" \
        -e "s/font-size:28px/font-size:24px;font-weight:600/g" \
        -e "s/font-size:24px/font-size:18px;font-weight:400/g" \
        -e "s/font-size:22px/font-size:18px;font-weight:400/g" \
        -e "s/font-size:20px/font-size:14px;font-weight:500/g" \
        -e "s/font-size:16px/font-size:14px;font-weight:500/g" \
        -e "s/font-size:44px;font-weight:800/font-size:32px;font-weight:700/g" \
        -e "s/text-align:left}/text-align:left;font-weight:600}/g" \
        "$file"
done

echo "Font standardization complete!"