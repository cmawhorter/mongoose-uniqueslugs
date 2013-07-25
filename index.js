
exports.enhanceSchema = function(schema, options)
{
  options = options || {};

  options.source = options.source || 'title';
  options.target = options.target || 'slug';
  // Everything except letters and digits becomes a dash. All modern browsers are
  // fine with UTF8 characters in URLs. If you don't like this, pass your own regexp
  // to match disallowed characters
  options.disallow = options.disallow || /[^\w\d]+/g;
  options.substitute = options.substitute || '-';

  if (!options.addSlugManually)
  {
    var slugDef = {};
    slugDef[options.target] = { type: String, unique: true };
    schema.add(slugDef);
  }

  schema.method('slug', function() {
    return this[options.target];
  });

  schema.method('_slugKey', function() {
    return options.target;
  });

  // "Wait, how does the slug become unique?" See enhanceModel below. We add digits to it
  // if and only if there is an actual error on save. This approach is concurrency safe
  // unlike the usual "hope nobody else makes a slug while we're still saving" strategy
  schema.pre('save', function (next) {
    var self = this;
    if (self.get('slug') === undefined)
    {
      // Come up with a unique slug, even if the title is not unique
      var originalSlug = self.get(options.source);
      originalSlug = originalSlug.toLowerCase().replace(options.disallow, options.substitute);
      // Lop off leading and trailing -
      if (originalSlug.length)
      {
        if (originalSlug.substr(0, 1) === options.substitute)
        {
          originalSlug = originalSlug.substr(1);
        }
        if (originalSlug.substr(originalSlug.length - 1, 1) === options.substitute)
        {
          originalSlug = originalSlug.substr(0, originalSlug.length - 1);
        }
      }
      self.set(options.target, originalSlug);
    }
    next();
  });
};

exports.enhanceModel = function(model)
{
  // Stash the original 'save' method so we can call it
  model.prototype.saveAfterExtendSlugOnUniqueIndexError = model.prototype.save;
  // Replace 'save' with a wrapper
  model.prototype.save = function(f)
  {
    var self = this
      , slugKey = self._slugKey();
    // Our replacement callback
    var extendSlugOnUniqueIndexError = function(err, d)
    {
      if (err)
      {
        // Spots unique index errors relating to the slug field
        if ((err.code === 11000) && (err.err.indexOf(slugKey) !== -1))
        {
          self[slugKey] += (Math.floor(Math.random() * 10)).toString();
          // Necessary because otherwise Mongoose doesn't allow us to retry save(),
          // at least until https://github.com/punkave/mongoose/commit/ea37acc8bd216abec68033fe9e667afa5fd9764c
          // is in the mainstream release
          self.isNew = true;
          self.save(extendSlugOnUniqueIndexError);
          return;
        }
      }
      // Not our special case so call the original callback
      f(err, d);
    };
    // Call the original save method, with our wrapper callback
    self.saveAfterExtendSlugOnUniqueIndexError(extendSlugOnUniqueIndexError);
  }
};
